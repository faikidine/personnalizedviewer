console.log("OTEIS Extension chargée avec succès !!");

class OTEISExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this.panel = null;
        this.button = null;
        this.isModelLoaded = false;
        this.resultsData = null;
        this.toolbarGroup = null;
    }

    load() {
        console.log("OTEIS Extension load() appelée.");
        
        // Attendre que le viewer soit complètement initialisé
        if (this.viewer.toolbar) {
            this.createToolbarButton();
        } else {
            // Attendre l'événement TOOLBAR_CREATED_EVENT
            this.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, () => {
                console.log("Toolbar créée, ajout du bouton OTEIS...");
                this.createToolbarButton();
            });
        }
        
        this.addEventListeners();
        return true;
    }

    unload() {
        this.removeUI();
        this.removeEventListeners();
        return true;
    }

    addEventListeners() {
        this.onGeometryLoadedBound = this.onGeometryLoaded.bind(this);
        this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onGeometryLoadedBound);
    }

    removeEventListeners() {
        if (this.onGeometryLoadedBound) {
            this.viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onGeometryLoadedBound);
        }
    }

    onGeometryLoaded() {
        console.log("Géométrie chargée, activation du bouton OTEIS");
        this.isModelLoaded = true;
        this.updateButtonState();
    }

    onModelLoaded() {
        console.log("Modèle chargé, activation du bouton OTEIS");
        this.isModelLoaded = true;
        this.updateButtonState();
        // Fermer le panel si ouvert lors du changement de modèle
        if (this.panel) {
            this.closePanel();
        }
    }

    createToolbarButton() {
        console.log("Création du bouton OTEIS dans la toolbar...");
        
        if (!this.viewer.toolbar) {
            console.error("Toolbar non disponible");
            return;
        }

        try {
            // Créer un nouveau groupe de contrôles pour notre bouton
            this.toolbarGroup = new Autodesk.Viewing.UI.ControlGroup('oteis-toolbar-group');
            
            // Créer le bouton
            this.button = new Autodesk.Viewing.UI.Button('oteis-analysis-button');
            this.button.setToolTip('Analyse Environnementale OTEIS');
            
            // Définir l'icône
            this.button.setIcon('adsk-icon-measure');
            
            // Définir l'action du bouton
            this.button.onClick = (event) => {
                console.log("Bouton OTEIS cliqué");
                this.togglePanel();
            };
            
            // Ajouter le bouton au groupe
            this.toolbarGroup.addControl(this.button);
            
            // Ajouter le groupe à la toolbar
            this.viewer.toolbar.addControl(this.toolbarGroup);
            
            // Désactiver initialement
            this.button.setState(Autodesk.Viewing.UI.Button.State.DISABLED);
            
            console.log("Bouton OTEIS créé avec succès dans la toolbar");
            this.updateButtonState();
            
        } catch (error) {
            console.error("Erreur lors de la création du bouton:", error);
            
            // Fallback: créer un bouton HTML simple
            this.createFallbackButton();
        }
    }

    createFallbackButton() {
        console.log("Création d'un bouton fallback...");
        
        // Créer un bouton HTML simple
        this.button = document.createElement("button");
        this.button.id = "oteis-btn";
        this.button.className = "btn btn-primary";
        this.button.title = "Analyse Environnementale OTEIS";
        this.button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            Analyse OTEIS
        `;
        
        this.button.style.cssText = `
            position: fixed;
            top: 70px;
            right: 10px;
            z-index: 1000;
            opacity: 0.7;
            cursor: not-allowed;
        `;
        
        this.button.disabled = true;
        this.button.onclick = () => this.togglePanel();
        
        document.body.appendChild(this.button);
        this.updateButtonState();
    }

    updateButtonState() {
        if (!this.button) return;
        
        if (this.isModelLoaded && this.viewer.model) {
            if (this.button.setState) {
                // Bouton Autodesk
                this.button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
            } else {
                // Bouton HTML fallback
                this.button.disabled = false;
                this.button.style.opacity = "1";
                this.button.style.cursor = "pointer";
            }
            console.log("Bouton OTEIS activé");
        } else {
            if (this.button.setState) {
                // Bouton Autodesk
                this.button.setState(Autodesk.Viewing.UI.Button.State.DISABLED);
            } else {
                // Bouton HTML fallback
                this.button.disabled = true;
                this.button.style.opacity = "0.7";
                this.button.style.cursor = "not-allowed";
            }
            console.log("Bouton OTEIS désactivé");
        }
    }

    removeUI() {
        if (this.button) {
            if (this.toolbarGroup && this.button.setState) {
                // Bouton Autodesk
                this.toolbarGroup.removeControl(this.button);
                this.viewer.toolbar.removeControl(this.toolbarGroup);
            } else {
                // Bouton HTML fallback
                this.button.remove();
            }
            this.button = null;
        }
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
    }

    togglePanel() {
        console.log("Toggle panel OTEIS");
        
        if (!this.isModelLoaded || !this.viewer.model) {
            this.showError("Aucun modèle chargé. Veuillez charger un modèle 3D pour effectuer l'analyse OTEIS.");
            return;
        }

        if (this.panel) {
            this.closePanel();
            if (this.button.setState) {
                this.button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
            }
        } else {
            this.openPanel();
            if (this.button.setState) {
                this.button.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
            }
        }
    }

    async openPanel() {
        console.log("Ouverture du panel OTEIS");
        this.createPanel();
        this.showLoading();
        
        try {
            await this.runOTEISCalculs();
            this.displayResults();
        } catch (error) {
            console.error("Erreur lors du calcul OTEIS:", error);
            this.showError("Erreur lors du calcul OTEIS. Vérifiez la console pour plus de détails.");
        }
    }

    closePanel() {
        console.log("Fermeture du panel OTEIS");
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
    }

    createPanel() {
        this.panel = document.createElement("div");
        this.panel.className = "oteis-panel";
        this.panel.style.cssText = `
            position: absolute;
            top: 5px;
            right: 10px;
            width: 420px;
            height: calc(100% - 10px);
            background: var(--bg-color, #ffffff);
            color: var(--text-color, #333333);
            border: 1px solid var(--border-color, #ddd);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        `;
        
        // Ajouter le panel au conteneur du viewer au lieu du body
        const viewerContainer = document.getElementById('preview');
        if (viewerContainer) {
            viewerContainer.appendChild(this.panel);
        } else {
            document.body.appendChild(this.panel);
        }

        // Header du panel
        const header = document.createElement("div");
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid var(--border-color, #ddd);
            background: var(--header-bg, #f8f9fa);
        `;

        const title = document.createElement("h3");
        title.textContent = "Analyse Environnementale OTEIS";
        title.style.cssText = "margin: 0; font-size: 16px; font-weight: 600;";

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "×";
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--text-color, #666);
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.onclick = () => this.togglePanel();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Content du panel
        this.panelContent = document.createElement("div");
        this.panelContent.style.cssText = "padding: 20px; flex: 1; overflow-y: auto;";

        this.panel.appendChild(header);
        this.panel.appendChild(this.panelContent);
    }

    showLoading() {
        this.panelContent.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #007ACC;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                "></div>
                <p>Analyse en cours...</p>
                <p style="font-size: 12px; color: #666;">Extraction des propriétés du modèle</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    showError(message) {
        if (this.panel) {
            this.panelContent.innerHTML = `
                <div style="
                    padding: 20px;
                    text-align: center;
                    color: #ef4444;
                    background: rgba(255, 255, 255, 0.8);
                    border-radius: 12px;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                ">
                    <strong>Erreur</strong><br>
                    ${message}
                </div>
            `;
        } else {
            // Afficher une notification temporaire
            const notification = document.createElement("div");
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ef4444;
                color: white;
                padding: 15px;
                border-radius: 12px;
                z-index: 10000;
                max-width: 300px;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.15);
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        }
    }

    async runOTEISCalculs() {
        if (!this.viewer.model) {
            throw new Error("Aucun modèle disponible");
        }

        console.log("Début des calculs OTEIS");

        return new Promise((resolve, reject) => {
            const tree = this.viewer.model.getData().instanceTree;
            if (!tree) {
                reject(new Error("Arbre d'instances non disponible"));
                return;
            }

            const rootId = tree.getRootId();
            const allDbIds = [];

            // Collecter tous les IDs
            tree.enumNodeChildren(rootId, (dbId) => {
                allDbIds.push(dbId);
            }, true);

            console.log(`Analyse de ${allDbIds.length} éléments...`);

            // Variables pour les calculs
            let surfaceTotale = 0;
            let volumeTotal = 0;
            let empreinteCarbone = 0;
            let consommationEnergie = 0;
            let coutEstime = 0;
            const materiaux = new Map();
            let elementsAnalyses = 0;
            let processedCount = 0;

            // Fonction pour traiter chaque élément
            const processElement = (dbId) => {
                this.viewer.getProperties(dbId, (props) => {
                    try {
                        if (props && props.properties) {
                            elementsAnalyses++;
                            
                            // Recherche des propriétés pertinentes
                            const material = this.findProperty(props.properties, ["Material", "Matériau", "Matériel"]);
                            const surface = this.findProperty(props.properties, ["Surface", "Area", "Aire"]);
                            const volume = this.findProperty(props.properties, ["Volume"]);
                            const length = this.findProperty(props.properties, ["Length", "Longueur"]);
                            const width = this.findProperty(props.properties, ["Width", "Largeur"]);
                            const height = this.findProperty(props.properties, ["Height", "Hauteur"]);

                            // Calcul de la surface
                            let surfaceElement = 0;
                            if (surface) {
                                surfaceElement = this.parseNumericValue(surface.displayValue);
                            } else if (length && width) {
                                surfaceElement = this.parseNumericValue(length.displayValue) * this.parseNumericValue(width.displayValue);
                            }

                            // Calcul du volume
                            let volumeElement = 0;
                            if (volume) {
                                volumeElement = this.parseNumericValue(volume.displayValue);
                            } else if (surfaceElement && height) {
                                volumeElement = surfaceElement * this.parseNumericValue(height.displayValue);
                            }

                            surfaceTotale += surfaceElement;
                            volumeTotal += volumeElement;

                            // Analyse du matériau
                            const materialName = material ? material.displayValue : "Inconnu";
                            const materialData = this.getMaterialData(materialName);
                            
                            // Compter les matériaux
                            if (materiaux.has(materialName)) {
                                const current = materiaux.get(materialName);
                                materiaux.set(materialName, {
                                    ...current,
                                    surface: current.surface + surfaceElement,
                                    volume: current.volume + volumeElement,
                                    count: current.count + 1
                                });
                            } else {
                                materiaux.set(materialName, {
                                    surface: surfaceElement,
                                    volume: volumeElement,
                                    count: 1,
                                    data: materialData
                                });
                            }

                            // Calculs environnementaux
                            const massElement = volumeElement * materialData.density; // en kg
                            empreinteCarbone += massElement * materialData.carbonFactor;
                            consommationEnergie += surfaceElement * materialData.energyFactor;
                            coutEstime += surfaceElement * materialData.costFactor;
                        }
                    } catch (error) {
                        console.warn("Erreur lors du traitement de l'élément", dbId, error);
                    }
                    
                    processedCount++;
                    
                    // Vérifier si tous les éléments ont été traités
                    if (processedCount >= allDbIds.length) {
                        // Calculs supplémentaires et avancés
                        const evalThermique = (surfaceTotale / 100) * 0.8; // kWh/m²
                        const recyclabilite = this.calculateRecyclability(materiaux);
                        const bilanGlobal = empreinteCarbone + (consommationEnergie * 0.5) + evalThermique;
                        
                        // Calculs avancés supplémentaires
                        const masseTotale = Array.from(materiaux.values()).reduce((total, info) => 
                            total + (info.volume * info.data.density), 0);
                        const coutMaintenance = coutEstime * 0.15; // 15% du coût initial par an
                        const economiesPotentielles = masseTotale * 0.02; // Économies via recyclage
                        const emissionsCO2Annuelles = empreinteCarbone * 0.05; // 5% par an d'usage
                        const consommationEauEstimee = surfaceTotale * 2.5; // L/m² pour construction
                        const dureeVieEstimee = 50; // Années
                        const impactBiodiversite = surfaceTotale * 0.1; // Score sur 100
                        const certificationsEcolo = recyclabilite > 70 ? "Éligible HQE/BREEAM" : "Standard";

                        this.resultsData = {
                            elementsAnalyses,
                            surfaceTotale,
                            volumeTotal,
                            empreinteCarbone,
                            consommationEnergie,
                            evalThermique,
                            bilanGlobal,
                            coutEstime,
                            recyclabilite,
                            materiaux: Array.from(materiaux.entries()),
                            // Nouvelles données
                            masseTotale,
                            coutMaintenance,
                            economiesPotentielles,
                            emissionsCO2Annuelles,
                            consommationEauEstimee,
                            dureeVieEstimee,
                            impactBiodiversite,
                            certificationsEcolo
                        };
                        
                        console.log("Calculs OTEIS terminés:", this.resultsData);
                        resolve();
                    }
                }, (error) => {
                    console.warn("Impossible de récupérer les propriétés pour", dbId, error);
                    processedCount++;
                    
                    if (processedCount >= allDbIds.length) {
                        // Calculs supplémentaires même en cas d'erreurs
                        const evalThermique = (surfaceTotale / 100) * 0.8;
                        const recyclabilite = this.calculateRecyclability(materiaux);
                        const bilanGlobal = empreinteCarbone + (consommationEnergie * 0.5) + evalThermique;

                        this.resultsData = {
                            elementsAnalyses,
                            surfaceTotale,
                            volumeTotal,
                            empreinteCarbone,
                            consommationEnergie,
                            evalThermique,
                            bilanGlobal,
                            coutEstime,
                            recyclabilite,
                            materiaux: Array.from(materiaux.entries())
                        };
                        
                        console.log("Calculs OTEIS terminés (avec erreurs):", this.resultsData);
                        resolve();
                    }
                });
            };

            // Traiter tous les éléments
            if (allDbIds.length === 0) {
                reject(new Error("Aucun élément trouvé dans le modèle"));
                return;
            }

            allDbIds.forEach(processElement);
        });
    }

    findProperty(properties, names) {
        for (const name of names) {
            const prop = properties.find(p => 
                p.displayName && p.displayName.toLowerCase().includes(name.toLowerCase())
            );
            if (prop) return prop;
        }
        return null;
    }

    parseNumericValue(value) {
        if (!value) return 0;
        const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? 0 : Math.abs(num);
    }

    getMaterialData(materialName) {
        const materials = {
            "Concrete": { density: 2400, carbonFactor: 0.2, energyFactor: 5, costFactor: 150 },
            "Steel": { density: 7850, carbonFactor: 2.3, energyFactor: 8, costFactor: 800 },
            "Wood": { density: 600, carbonFactor: 0.1, energyFactor: 2, costFactor: 400 },
            "Glass": { density: 2500, carbonFactor: 0.8, energyFactor: 12, costFactor: 200 },
            "Aluminum": { density: 2700, carbonFactor: 9.0, energyFactor: 15, costFactor: 1500 },
            "Brick": { density: 1800, carbonFactor: 0.3, energyFactor: 3, costFactor: 100 },
            "Plaster": { density: 1200, carbonFactor: 0.1, energyFactor: 1, costFactor: 50 }
        };

        // Recherche par correspondance partielle
        for (const [key, data] of Object.entries(materials)) {
            if (materialName.toLowerCase().includes(key.toLowerCase())) {
                return data;
            }
        }

        // Valeurs par défaut
        return { density: 1000, carbonFactor: 0.1, energyFactor: 5, costFactor: 100 };
    }

    calculateRecyclability(materiaux) {
        const recyclabilityMap = {
            "Steel": 0.9,
            "Aluminum": 0.95,
            "Glass": 0.8,
            "Wood": 0.3,
            "Concrete": 0.1,
            "Brick": 0.05,
            "Plaster": 0.02
        };

        let totalMass = 0;
        let recyclableMass = 0;

        for (const [materialName, info] of materiaux) {
            const mass = info.volume * info.data.density;
            totalMass += mass;
            
            for (const [key, rate] of Object.entries(recyclabilityMap)) {
                if (materialName.toLowerCase().includes(key.toLowerCase())) {
                    recyclableMass += mass * rate;
                    break;
                }
            }
        }

        return totalMass > 0 ? (recyclableMass / totalMass) * 100 : 0;
    }

    // Fonctions de formatage des nombres et unités
    formatNumber(value) {
        if (value >= 1000000000) {
            return (value / 1000000000).toFixed(2) + ' Md';
        } else if (value >= 1000000) {
            return (value / 1000000).toFixed(2) + ' M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(2) + ' K';
        } else {
            return value.toFixed(2);
        }
    }

    formatVolume(volume) {
        if (volume >= 1000000) {
            return (volume / 1000000).toFixed(2) + ' Mm³';
        } else if (volume >= 1000) {
            return (volume / 1000).toFixed(2) + ' Km³';
        } else {
            return volume.toFixed(2) + ' m³';
        }
    }

    formatSurface(surface) {
        if (surface >= 10000) {
            return (surface / 10000).toFixed(2) + ' ha';
        } else if (surface >= 1000000) {
            return (surface / 1000000).toFixed(2) + ' km²';
        } else {
            return surface.toFixed(2) + ' m²';
        }
    }

    formatWeight(weight) {
        if (weight >= 1000000) {
            return (weight / 1000000).toFixed(2) + ' kt';
        } else if (weight >= 1000) {
            return (weight / 1000).toFixed(2) + ' t';
        } else {
            return weight.toFixed(2) + ' kg';
        }
    }

    formatCurrency(amount) {
        if (amount >= 1000000000) {
            return (amount / 1000000000).toFixed(2) + ' Md €';
        } else if (amount >= 1000000) {
            return (amount / 1000000).toFixed(2) + ' M €';
        } else if (amount >= 1000) {
            return (amount / 1000).toFixed(2) + ' K €';
        } else {
            return amount.toFixed(2) + ' €';
        }
    }

    formatEnergy(energy) {
        if (energy >= 1000000) {
            return (energy / 1000000).toFixed(2) + ' GWh';
        } else if (energy >= 1000) {
            return (energy / 1000).toFixed(2) + ' MWh';
        } else {
            return energy.toFixed(2) + ' kWh';
        }
    }

    displayResults() {
        if (!this.resultsData) return;

        const data = this.resultsData;
        
        this.panelContent.innerHTML = `
            <div class="oteis-results">
                <!-- Métriques principales -->
                <div class="section">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 3v18h18"/>
                            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                        </svg>
                        Analyse Structurelle
                    </h3>
                    <div class="metric-grid">
                        <div class="metric-card">
                            <div class="metric-value">${this.formatNumber(data.elementsAnalyses)}</div>
                            <div class="metric-label">Éléments analysés</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${this.formatSurface(data.surfaceTotale)}</div>
                            <div class="metric-label">Surface totale</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${this.formatVolume(data.volumeTotal)}</div>
                            <div class="metric-label">Volume total</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${this.formatWeight(data.masseTotale)}</div>
                            <div class="metric-label">Masse totale</div>
                        </div>
                    </div>
                </div>

                <!-- Impact environnemental -->
                <div class="section">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                            <path d="M8 12l2 2 4-4"/>
                        </svg>
                        Impact Environnemental
                    </h3>
                    <div class="metric-grid">
                        <div class="metric-card impact">
                            <div class="metric-value">${this.formatWeight(data.empreinteCarbone)}</div>
                            <div class="metric-label">CO₂ équivalent</div>
                        </div>
                        <div class="metric-card impact">
                            <div class="metric-value">${this.formatWeight(data.emissionsCO2Annuelles)}</div>
                            <div class="metric-label">CO₂ annuel (usage)</div>
                        </div>
                        <div class="metric-card energy">
                            <div class="metric-value">${this.formatEnergy(data.consommationEnergie)}</div>
                            <div class="metric-label">Consommation énergie</div>
                        </div>
                        <div class="metric-card energy">
                            <div class="metric-value">${this.formatEnergy(data.evalThermique)}</div>
                            <div class="metric-label">Évaluation thermique</div>
                        </div>
                        <div class="metric-card water">
                            <div class="metric-value">${this.formatNumber(data.consommationEauEstimee)} L</div>
                            <div class="metric-label">Consommation eau</div>
                        </div>
                        <div class="metric-card bio">
                            <div class="metric-value">${data.impactBiodiversite.toFixed(1)}/100</div>
                            <div class="metric-label">Impact biodiversité</div>
                        </div>
                    </div>
                </div>

                <!-- Analyse économique -->
                <div class="section">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        Analyse Économique
                    </h3>
                    <div class="metric-grid">
                        <div class="metric-card cost">
                            <div class="metric-value">${this.formatCurrency(data.coutEstime)}</div>
                            <div class="metric-label">Coût construction</div>
                        </div>
                        <div class="metric-card cost">
                            <div class="metric-value">${this.formatCurrency(data.coutMaintenance)}</div>
                            <div class="metric-label">Coût maintenance/an</div>
                        </div>
                        <div class="metric-card savings">
                            <div class="metric-value">${this.formatCurrency(data.economiesPotentielles)}</div>
                            <div class="metric-label">Économies recyclage</div>
                        </div>
                        <div class="metric-card time">
                            <div class="metric-value">${data.dureeVieEstimee} ans</div>
                            <div class="metric-label">Durée de vie</div>
                        </div>
                    </div>
                </div>

                <!-- Certifications -->
                <div class="section">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="8" r="7"/>
                            <polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"/>
                        </svg>
                        Certifications
                    </h3>
                    <div class="certification-card">
                        <div class="cert-status ${data.recyclabilite > 70 ? 'eligible' : 'standard'}">${data.certificationsEcolo}</div>
                        <div class="cert-score">Score recyclabilité: ${data.recyclabilite.toFixed(1)}%</div>
                    </div>
                </div>

                <!-- Bilan Global -->
                <div class="section">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                        </svg>
                        Bilan Global
                    </h3>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(data.bilanGlobal / 1000 * 100, 100)}%"></div>
                        <span class="progress-text">${data.bilanGlobal.toFixed(1)} points</span>
                    </div>
                </div>

                <!-- Recyclabilité -->
                <div class="section">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M7 19H4.815a1.83 1.83 0 01-1.57-.881 1.785 1.785 0 01-.004-1.784L7.196 9.5"/>
                            <path d="M11 19h8.203a1.83 1.83 0 001.556-.89 1.784 1.784 0 000-1.775L16.804 9.5"/>
                            <path d="M14 16l-3-3 3-3"/>
                            <path d="M8.5 2.5L11 5 8.5 7.5"/>
                        </svg>
                        Recyclabilité
                    </h3>
                    <div class="progress-bar recyclability">
                        <div class="progress-fill" style="width: ${data.recyclabilite}%"></div>
                        <span class="progress-text">${data.recyclabilite.toFixed(1)}%</span>
                    </div>
                </div>

                <!-- Matériaux détaillés -->
                <div class="section">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="9" cy="9" r="2"/>
                            <path d="M21 15.5c-7 0-9.5-3.5-9.5-7"/>
                        </svg>
                        Répartition des Matériaux
                    </h3>
                    <div class="materials-list">
                        ${data.materiaux.map(([name, info]) => `
                            <div class="material-item">
                                <div class="material-header">
                                    <span class="material-name">${name}</span>
                                    <span class="material-count">${info.count} éléments</span>
                                </div>
                                <div class="material-details">
                                    <span>Surface: ${this.formatSurface(info.surface)}</span>
                                    <span>Volume: ${this.formatVolume(info.volume)}</span>
                                    <span>Masse: ${this.formatWeight(info.volume * info.data.density)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="actions">
                    <button onclick="navigator.clipboard?.writeText(JSON.stringify(${JSON.stringify(data)}, null, 2))" 
                            class="copy-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        </svg>
                        Exporter les données
                    </button>
                </div>
            </div>

            <style>
                .oteis-results { 
                    font-size: 14px; 
                    line-height: 1.4;
                }
                
                .section {
                    margin-bottom: 24px;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .section h3 {
                    margin: 0 0 16px 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #333;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .metric-grid { 
                    display: grid; 
                    grid-template-columns: repeat(2, 1fr); 
                    gap: 12px; 
                }
                
                .metric-card { 
                    padding: 16px; 
                    background: rgba(255, 255, 255, 0.8); 
                    border-radius: 8px; 
                    text-align: center;
                    border-left: 4px solid #007ACC;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .metric-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                }
                
                .metric-card.impact { border-left-color: #ef4444; }
                .metric-card.energy { border-left-color: #f59e0b; }
                .metric-card.cost { border-left-color: #10b981; }
                .metric-card.water { border-left-color: #3b82f6; }
                .metric-card.bio { border-left-color: #8b5cf6; }
                .metric-card.savings { border-left-color: #059669; }
                .metric-card.time { border-left-color: #6b7280; }
                
                .metric-value { 
                    font-size: 18px; 
                    font-weight: bold; 
                    margin-bottom: 6px; 
                    color: #1f2937;
                }
                
                .metric-label { 
                    font-size: 12px; 
                    color: #6b7280; 
                    text-transform: uppercase; 
                    font-weight: 500;
                }
                
                .certification-card {
                    background: rgba(255, 255, 255, 0.8);
                    padding: 16px;
                    border-radius: 8px;
                    text-align: center;
                }
                
                .cert-status {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 8px;
                }
                
                .cert-status.eligible {
                    color: #10b981;
                }
                
                .cert-status.standard {
                    color: #f59e0b;
                }
                
                .cert-score {
                    color: #6b7280;
                    font-size: 14px;
                }
                
                .progress-bar { 
                    position: relative; 
                    background: rgba(0,0,0,0.1); 
                    border-radius: 12px; 
                    height: 24px; 
                    overflow: hidden; 
                }
                
                .progress-fill { 
                    height: 100%; 
                    background: linear-gradient(90deg, #007ACC, #0099ff); 
                    transition: width 0.5s ease; 
                    border-radius: 12px;
                }
                
                .progress-bar.recyclability .progress-fill { 
                    background: linear-gradient(90deg, #10b981, #34d399); 
                }
                
                .progress-text { 
                    position: absolute; 
                    top: 50%; 
                    left: 50%; 
                    transform: translate(-50%, -50%); 
                    color: white; 
                    font-weight: bold; 
                    font-size: 13px; 
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.7); 
                }
                
                .materials-list { 
                    max-height: 300px; 
                    overflow-y: auto; 
                }
                
                .material-item { 
                    background: rgba(255, 255, 255, 0.6);
                    padding: 12px; 
                    margin-bottom: 8px;
                    border-radius: 8px;
                    border: 1px solid rgba(0,0,0,0.1);
                }
                
                .material-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                
                .material-name { 
                    font-weight: 600; 
                    color: #1f2937;
                }
                
                .material-count {
                    color: #6b7280;
                    font-size: 12px;
                    background: rgba(0,0,0,0.1);
                    padding: 2px 8px;
                    border-radius: 12px;
                }
                
                .material-details {
                    display: flex;
                    gap: 16px;
                    font-size: 12px;
                    color: #6b7280;
                }
                
                .copy-btn {
                    background: linear-gradient(135deg, #007ACC, #0099ff);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
                }
                
                .copy-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 122, 204, 0.4);
                }
                
                .actions { 
                    text-align: center; 
                    padding-top: 20px; 
                    border-top: 1px solid rgba(0,0,0,0.1); 
                }
            </style>
        `;
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
    "OTEISExtension",
    OTEISExtension
);
  