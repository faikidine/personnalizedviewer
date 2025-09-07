const { AuthenticationClient, Scopes } = require('@aps_sdk/authentication');
const { OssClient, Region, PolicyKey } = require('@aps_sdk/oss');
const { ModelDerivativeClient, View, OutputType } = require('@aps_sdk/model-derivative');
const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET } = require('../config.js');

const authenticationClient = new AuthenticationClient();
const ossClient = new OssClient();
const modelDerivativeClient = new ModelDerivativeClient();

const service = module.exports = {};

// FONCTION UTILITAIRE: Retry avec délai progressif
async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`Retry ${attempt}/${maxAttempts} dans ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

async function getInternalToken() {
    const credentials = await authenticationClient.getTwoLeggedToken(APS_CLIENT_ID, APS_CLIENT_SECRET, [
        Scopes.DataRead,
        Scopes.DataCreate,
        Scopes.DataWrite,
        Scopes.BucketCreate,
        Scopes.BucketRead
    ]);
    return credentials.access_token;
}

service.getViewerToken = async () => {
    return await authenticationClient.getTwoLeggedToken(APS_CLIENT_ID, APS_CLIENT_SECRET, [Scopes.ViewablesRead]);
};

service.ensureBucketExists = async (bucketKey) => {
    const accessToken = await getInternalToken();
    try {
        await ossClient.getBucketDetails(bucketKey, { accessToken });
    } catch (err) {
        if (err.axiosError.response.status === 404) {
            await ossClient.createBucket(Region.Us, { bucketKey: bucketKey, policyKey: PolicyKey.Persistent }, { accessToken});
        } else {
            throw err;  
        }
    }
};

service.listObjects = async () => {
    await service.ensureBucketExists(APS_BUCKET);
    const accessToken = await getInternalToken();
    let resp = await ossClient.getObjects(APS_BUCKET, { limit: 64, accessToken });
    let objects = resp.items;
    while (resp.next) {
        const startAt = new URL(resp.next).searchParams.get('startAt');
        resp = await ossClient.getObjects(APS_BUCKET, { limit: 64, startAt, accessToken });
        objects = objects.concat(resp.items);
    }
    return objects;
};

service.uploadObject = async (objectName, filePath) => {
    await service.ensureBucketExists(APS_BUCKET);
    const accessToken = await getInternalToken();
    const obj = await ossClient.uploadObject(APS_BUCKET, objectName, filePath, { accessToken });
    return obj;
};

service.translateObject = async (objectId, rootFilename) => {
    const accessToken = await getInternalToken();
    
    // CONVERSION CORRECTE: objectId → URN Base64 pour l'API
    const urnForApi = Buffer.from(objectId).toString('base64').replace(/=/g, '');
    
    console.log('translateObject ObjectId:', objectId);
    console.log('translateObject URN for API:', urnForApi);
    console.log('Root filename:', rootFilename);
    
    const jobPayload = {
        input: {
            urn: urnForApi,
            compressedUrn: !!rootFilename,
            rootFilename: rootFilename || undefined
        },
        output: {
            formats: [{
                views: [View._2d, View._3d],
                type: OutputType.Svf2
            }]
        }
    };
    
    // FORCING: Retry jusqu'à 3 fois
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            console.log(`Tentative ${attempt}/3 de traduction...`);
            
            const job = await modelDerivativeClient.startJob(jobPayload, { accessToken });
            
            console.log('Translation job started:', job.result);
            return job.result;
            
        } catch (err) {
            lastError = err;
            console.error(`Tentative ${attempt}/3 échouée:`, err.message);
            console.error('Error details:', err.axiosError?.response?.data);
            
            if (attempt < 3) {
                console.log(`Attente 2s avant retry...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    
    throw lastError;
};

service.getManifest = async (urn) => {
    const accessToken = await getInternalToken();
    try {
        // CORRECTION: Décoder l'URN si nécessaire
        const decodedUrn = urn.includes('%') ? decodeURIComponent(urn) : urn;
        console.log('getManifest URN:', decodedUrn);
        
        const manifest = await modelDerivativeClient.getManifest(decodedUrn, { accessToken });
        return manifest;
    } catch (err) {
        console.error('getManifest Error:', err.message);
        if (err.axiosError && err.axiosError.response && err.axiosError.response.status === 404) {
            return null;
        } else {
            throw err;
        }
    }
};

service.urnify = (id) => Buffer.from(id).toString('base64').replace(/=/g, '');