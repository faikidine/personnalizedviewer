const express = require('express');
const formidable = require('express-formidable');
const { listObjects, uploadObject, translateObject, getManifest, urnify } = require('../services/aps.js');

let router = express.Router();

router.get('/api/models', async function (req, res, next) {
    try {
        const objects = await listObjects();
        res.json(objects.map(o => ({
            name: o.objectKey,
            urn: urnify(o.objectId)
        })));
    } catch (err) {
        next(err);
    }
});

router.get('/api/models/:urn/status', async function (req, res, next) {
    try {
        console.log('Checking status for URN:', req.params.urn);
        
        const manifest = await getManifest(req.params.urn);
        if (manifest) {
            let messages = [];
            if (manifest.derivatives) {
                for (const derivative of manifest.derivatives) {
                    messages = messages.concat(derivative.messages || []);
                    if (derivative.children) {
                        for (const child of derivative.children) {
                            messages = messages.concat(child.messages || []);
                        }
                    }
                }
            }
            console.log('Manifest found - Status:', manifest.status, 'Progress:', manifest.progress);
            res.json({ status: manifest.status, progress: manifest.progress, messages });
        } else {
            console.log('No manifest found - returning n/a');
            res.json({ status: 'n/a' });
        }
    } catch (err) {
        console.error('Status check error:', err.message);
        next(err);
    }
});

router.post('/api/models', formidable({ maxFileSize: Infinity }), async function (req, res, next) {
    const file = req.files['model-file'];
    if (!file) {
        res.status(400).send('The required field ("model-file") is missing.');
        return;
    }
    try {
        const obj = await uploadObject(file.name, file.path);
        console.log('Object uploaded:', obj.objectId);
        
        // CORRECTION CRITIQUE: translateObject utilise l'objectId RAW, pas l'URN encodé !
        await translateObject(obj.objectId, req.fields['model-zip-entrypoint']);
        
        res.json({
            name: obj.objectKey,
            urn: urnify(obj.objectId)
        });
    } catch (err) {
        console.error('Upload/Translation error:', err.message);
        next(err);
    }
});

// NOUVELLE ROUTE: Force la retraduction d'un modèle
router.post('/api/models/:urn/force-translate', async function (req, res, next) {
    try {
        console.log('FORCING translation for URN:', req.params.urn);
        
        // Décoder l'URN pour récupérer l'objectId
        const objectId = Buffer.from(req.params.urn, 'base64').toString();
        console.log('Decoded ObjectId:', objectId);
        
        // Forcer la retraduction
        const result = await translateObject(objectId, req.body.rootFilename);
        
        res.json({
            message: 'Traduction forcée avec succès',
            result: result
        });
    } catch (err) {
        console.error('Force translate error:', err.message);
        next(err);
    }
});

module.exports = router;
