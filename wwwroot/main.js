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

    // Ne pas charger automatiquement un modèle, mais afficher l'écran d'accueil
    setupModelSelection(viewer, null);
    setupModelUpload(viewer);
    showWelcomeScreen();
});

async function setupModelSelection(viewer, selectedUrn) {
    const dropdown = document.getElementById('models');
    dropdown.innerHTML = '<option value="">Sélectionnez un modèle...</option>';
    try {
        const resp = await fetch('/api/models');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const models = await resp.json();
        dropdown.innerHTML += models.map(model => `<option value=${model.urn} ${model.urn === selectedUrn ? 'selected' : ''}>${model.name}</option>`).join('\n');
        dropdown.onchange = () => {
            if (dropdown.value) {
                hideWelcomeScreen();
                onModelSelected(viewer, dropdown.value);
            }
        };
        // Ne pas charger automatiquement un modèle
        // Synchroniser la liste de l'écran d'accueil
        syncWelcomeModelList();
    } catch (err) {
        showNotification('Impossible de charger la liste des modèles. Consultez la console pour plus de détails.', 'error');
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
        if (file.name.endsWith('.zip')) { // Lors du téléversement d'un fichier zip, demander le fichier principal dans l'archive
            const entrypoint = window.prompt('Veuillez entrer le nom du fichier principal dans l\'archive.');
            data.append('model-zip-entrypoint', entrypoint);
        }
        hideWelcomeScreen();
        upload.setAttribute('disabled', 'true');
        upload.classList.add('loading');
        models.setAttribute('disabled', 'true');
        showNotification(`Téléversement du modèle <strong>${file.name}</strong>. Ne rechargez pas la page.`, 'info');
        try {
            const resp = await fetch('/api/models', { method: 'POST', body: data });
            if (!resp.ok) {
                throw new Error(await resp.text());
            }
            const model = await resp.json();
            showNotification(`Modèle <strong>${file.name}</strong> téléversé avec succès !`, 'success');
            setTimeout(() => {
                setupModelSelection(viewer, model.urn);
                clearNotification();
            }, 2000);
        } catch (err) {
            showNotification(`Impossible de téléverser le modèle <strong>${file.name}</strong>. Consultez la console pour plus de détails.`, 'error');
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
                showNotification(`Le modèle n'a pas été traduit. <button onclick="forceTranslation('${urn}')" style="margin-left: 10px; padding: 5px 10px; background: #ff6b35; color: white; border: none; border-radius: 3px; cursor: pointer;">🔥 Forcer la traduction</button>`, 'warning');
                break;
            case 'inprogress':
                showNotification(`Le modèle est en cours de traduction (${status.progress})...`, 'info');
                window.onModelSelectedTimeout = setTimeout(onModelSelected, 5000, viewer, urn);
                break;
            case 'failed':
                showNotification(`Échec de la traduction. <ul>${status.messages.map(msg => `<li>${JSON.stringify(msg)}</li>`).join('')}</ul>`, 'error');
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
        showNotification('Impossible de charger le modèle. Consultez la console pour plus de détails.', 'error');
        console.error(err);
    }
}

function showNotification(message, type = 'info') {
    const overlay = document.getElementById('overlay');
    const notification = overlay.querySelector('.notification');
    
    // Set notification content and type
    let content = `<div class="notification-content">${message}</div>`;
    
    // Ajouter un bouton OK pour les erreurs
    if (type === 'error' || type === 'warning') {
        content += `<div class="notification-actions">
            <button onclick="clearNotification()" class="btn btn-primary notification-ok-btn">OK</button>
        </div>`;
    }
    
    notification.innerHTML = content;
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

// FONCTION DE FORCING: Force la retraduction d'un modèle
async function forceTranslation(urn) {
    try {
        showNotification('Forcing de la traduction en cours...', 'info');
        
        const resp = await fetch(`/api/models/${urn}/force-translate`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        
        const result = await resp.json();
        showNotification('Traduction forcée avec succès ! Vérification du statut...', 'success');
        
        // Attendre 3 secondes puis vérifier le statut
        setTimeout(() => {
            onModelSelected(currentViewer, urn);
        }, 3000);
        
    } catch (err) {
        showNotification('Erreur lors du forcing: ' + err.message, 'error');
        console.error('Force translation error:', err);
    }
}

// Rendre la fonction accessible globalement
window.forceTranslation = forceTranslation;

// Fonctions pour gérer l'écran d'accueil
function showWelcomeScreen() {
    const previewContainer = document.getElementById('preview');
    
    // Vérifier si l'écran d'accueil existe déjà
    let welcomeScreen = document.getElementById('welcome-screen');
    if (!welcomeScreen) {
        welcomeScreen = document.createElement('div');
        welcomeScreen.id = 'welcome-screen';
        welcomeScreen.className = 'welcome-screen';
        
        welcomeScreen.innerHTML = `
            <div class="welcome-content">
                <div class="welcome-actions">
                    <button id="welcome-upload-btn" class="welcome-btn welcome-btn-primary">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>Téléverser un modèle</span>
                    </button>
                    
                    <div class="welcome-divider">
                        <span>ou</span>
                    </div>
                    
                    <div class="welcome-select-wrapper">
                        <label for="welcome-model-select" class="welcome-select-label">Choisir un modèle existant :</label>
                        <select id="welcome-model-select" class="welcome-select">
                            <option value="">Sélectionnez un modèle...</option>
                        </select>
                    </div>
                </div>
                
                <div class="welcome-features">
                    <div class="welcome-feature">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
                            <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.5"/>
                        </svg>
                        <span>Analyse environnementale OTEIS</span>
                    </div>
                    <div class="welcome-feature">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.09 0 2.14-.18 3.12-.5L20 24l-1.5-4.88C20.32 17.14 22 14.76 22 12c0-5.52-4.48-10-10-10z" stroke="currentColor" stroke-width="2" fill="none"/>
                            <circle cx="8" cy="12" r="1" fill="currentColor"/>
                            <circle cx="12" cy="12" r="1" fill="currentColor"/>
                            <circle cx="16" cy="12" r="1" fill="currentColor"/>
                        </svg>
                        <span>Assistant IA intégré</span>
                    </div>
                    <div class="welcome-feature">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7M3 7L21 7M3 7V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V7" stroke="currentColor" stroke-width="2"/>
                            <path d="M8 11H16M8 15H12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>Visualisation 3D avancée</span>
                    </div>
                </div>
            </div>
        `;
        
        previewContainer.appendChild(welcomeScreen);
        
        // Ajouter les event listeners
        setupWelcomeScreenEvents();
    }
    
    welcomeScreen.style.display = 'flex';
    previewContainer.classList.add('has-welcome-screen');
    
    // Synchroniser la liste déroulante de l'écran d'accueil avec celle du header
    syncWelcomeModelList();
}

function hideWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const previewContainer = document.getElementById('preview');
    
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
    if (previewContainer) {
        previewContainer.classList.remove('has-welcome-screen');
    }
}

function setupWelcomeScreenEvents() {
    const uploadBtn = document.getElementById('welcome-upload-btn');
    const modelSelect = document.getElementById('welcome-model-select');
    const fileInput = document.getElementById('input');
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            if (modelSelect.value) {
                const headerSelect = document.getElementById('models');
                headerSelect.value = modelSelect.value;
                hideWelcomeScreen();
                onModelSelected(currentViewer, modelSelect.value);
            }
        });
    }
}

function syncWelcomeModelList() {
    const headerSelect = document.getElementById('models');
    const welcomeSelect = document.getElementById('welcome-model-select');
    
    if (headerSelect && welcomeSelect) {
        welcomeSelect.innerHTML = headerSelect.innerHTML;
    }
}
