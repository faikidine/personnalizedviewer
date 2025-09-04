import { initViewer, loadModel } from './viewer.js';
import './OTEIS_Extension.js';
import './ChatBot_Extension.js';

// Theme management
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Check for saved theme in localStorage or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Add transition class to body for smooth theme switching
        body.style.transition = 'all 0.3s ease';
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Remove transition after animation completes
        setTimeout(() => {
            body.style.transition = '';
        }, 300);
    });
}

// Initialize theme on page load
initTheme();

let currentViewer = null;

initViewer(document.getElementById('preview')).then(viewer => {
    currentViewer = viewer;
    
    // Charger les extensions personnalisées
    viewer.loadExtension("OTEISExtension").then(() => {
        console.log("Extension OTEIS chargée avec succès.");
    }).catch(err => {
        console.error("Erreur de chargement de l'extension OTEIS :", err);
    });

    viewer.loadExtension("ChatBotExtension").then(() => {
        console.log("Extension ChatBot chargée avec succès.");
    }).catch(err => {
        console.error("Erreur de chargement de l'extension ChatBot :", err);
    });

    const urn = window.location.hash?.substring(1);
    setupModelSelection(viewer, urn);
    setupModelUpload(viewer);
});

async function setupModelSelection(viewer, selectedUrn) {
    const dropdown = document.getElementById('models');
    dropdown.innerHTML = '';
    try {
        const resp = await fetch('/api/models');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const models = await resp.json();
        dropdown.innerHTML = models.map(model => `<option value=${model.urn} ${model.urn === selectedUrn ? 'selected' : ''}>${model.name}</option>`).join('\n');
        dropdown.onchange = () => onModelSelected(viewer, dropdown.value);
        if (dropdown.value) {
            onModelSelected(viewer, dropdown.value);
        }
    } catch (err) {
        showNotification('Could not list models. See the console for more details.', 'error');
        console.error(err);
    }
}

async function setupModelUpload(viewer) {
    const upload = document.getElementById('upload');
    const input = document.getElementById('input');
    const models = document.getElementById('models');
    upload.onclick = () => input.click();
    input.onchange = async () => {
        const file = input.files[0];
        let data = new FormData();
        data.append('model-file', file);
        if (file.name.endsWith('.zip')) { // When uploading a zip file, ask for the main design file in the archive
            const entrypoint = window.prompt('Please enter the filename of the main design inside the archive.');
            data.append('model-zip-entrypoint', entrypoint);
        }
        upload.setAttribute('disabled', 'true');
        upload.classList.add('loading');
        models.setAttribute('disabled', 'true');
        showNotification(`Uploading model <strong>${file.name}</strong>. Do not reload the page.`, 'info');
        try {
            const resp = await fetch('/api/models', { method: 'POST', body: data });
            if (!resp.ok) {
                throw new Error(await resp.text());
            }
            const model = await resp.json();
            showNotification(`Model <strong>${file.name}</strong> uploaded successfully!`, 'success');
            setTimeout(() => {
                setupModelSelection(viewer, model.urn);
                clearNotification();
            }, 2000);
        } catch (err) {
            showNotification(`Could not upload model <strong>${file.name}</strong>. See the console for more details.`, 'error');
            console.error(err);
        } finally {
            upload.removeAttribute('disabled');
            upload.classList.remove('loading');
            models.removeAttribute('disabled');
            input.value = '';
        }
    };
}

async function onModelSelected(viewer, urn) {
    if (window.onModelSelectedTimeout) {
        clearTimeout(window.onModelSelectedTimeout);
        delete window.onModelSelectedTimeout;
    }
    window.location.hash = urn;
    try {
        const resp = await fetch(`/api/models/${urn}/status`);
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const status = await resp.json();
        switch (status.status) {
            case 'n/a':
                showNotification(`Model has not been translated.`, 'warning');
                break;
            case 'inprogress':
                showNotification(`Model is being translated (${status.progress})...`, 'info');
                window.onModelSelectedTimeout = setTimeout(onModelSelected, 5000, viewer, urn);
                break;
            case 'failed':
                showNotification(`Translation failed. <ul>${status.messages.map(msg => `<li>${JSON.stringify(msg)}</li>`).join('')}</ul>`, 'error');
                break;
            default:
                clearNotification();
                loadModel(viewer, urn);
                // Notifier les extensions qu'un nouveau modèle est chargé
                if (viewer.getExtension('OTEISExtension')) {
                    const ext = viewer.getExtension('OTEISExtension');
                    ext.onModelLoaded();
                }
                if (viewer.getExtension('ChatBotExtension')) {
                    const ext = viewer.getExtension('ChatBotExtension');
                    if (ext.onModelLoaded) ext.onModelLoaded();
                }
                break; 
        }
    } catch (err) {
        showNotification('Could not load model. See the console for more details.', 'error');
        console.error(err);
    }
}

function showNotification(message, type = 'info') {
    const overlay = document.getElementById('overlay');
    const notification = overlay.querySelector('.notification');
    
    // Set notification content and type
    notification.innerHTML = message;
    notification.className = `notification notification-${type}`;
    
    // Show overlay with animation
    overlay.style.display = 'flex';
    // Force reflow to ensure display:flex is applied before adding show class
    overlay.offsetHeight;
    overlay.classList.add('show');
}

function clearNotification() {
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('show');
    
    // Hide overlay after animation completes
    setTimeout(() => {
        overlay.style.display = 'none';
        const notification = overlay.querySelector('.notification');
        notification.innerHTML = '';
        notification.className = 'notification';
    }, 300);
}

// Rendre le viewer accessible globalement pour les extensions
window.getCurrentViewer = () => currentViewer;
