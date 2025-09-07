console.log("ChatBot Extension chargée avec succès !!");

class ChatBotExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this.panel = null;
        this.button = null;
        this.isModelLoaded = false;
        this.chatHistory = [];
        this.isProcessing = false;
        this.toolbarGroup = null;
        this.modelElements = null; // Cache des éléments parsés
        this.modelSummary = null; // Résumé du modèle pour le chatbot

        // Mapping des commandes - CRITIQUE pour le fonctionnement !
        this.commands = new Map([
            ['isolate_elements', this.isolateElements.bind(this)],
            ['show_all_elements', this.showAllElements.bind(this)],
            ['count_elements', this.countElements.bind(this)],
            ['search_elements', this.searchElements.bind(this)],
            ['get_properties', this.getElementProperties.bind(this)],
            ['hide_elements', this.hideElements.bind(this)],
            ['change_color', this.changeElementColor.bind(this)],
            ['get_model_info', this.getModelInfo.bind(this)],
            ['zoom_to_elements', this.zoomToElements.bind(this)],
            ['get_layers', this.getLayers.bind(this)],
            ['toggle_layer', this.toggleLayer.bind(this)],
            ['measure_distance', this.measureDistance.bind(this)],
            ['create_section', this.createSection.bind(this)]
        ]);
    }

    load() {
        console.log("ChatBot Extension load() appelée.");
        
        if (this.viewer.toolbar) {
            this.createToolbarButton();
        } else {
            this.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, () => {
                console.log("Toolbar créée, ajout du bouton ChatBot...");
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

    async onGeometryLoaded() {
        console.log("Géométrie chargée, activation du bouton ChatBot");
        this.isModelLoaded = true;
        this.updateButtonState();
        
        // Parser les éléments du modèle en arrière-plan
        await this.parseModelElements();
    }

    async onModelLoaded() {
        console.log("Modèle chargé, activation du bouton ChatBot");
        this.isModelLoaded = true;
        this.updateButtonState();
        this.chatHistory = []; // Reset de l'historique
        
        // Parser les éléments du modèle
        await this.parseModelElements();
    }

    // NOUVELLE MÉTHODE : Parser tous les éléments du modèle
    async parseModelElements() {
        if (!this.viewer.model) {
            console.log("Aucun modèle à parser");
            return;
        }

        console.log("Parsing des éléments du modèle en cours...");
        
        return new Promise((resolve) => {
            const tree = this.viewer.model.getData().instanceTree;
            if (!tree) {
                console.warn("Arbre d'instances non disponible");
                this.modelElements = null;
                this.modelSummary = null;
                resolve();
                return;
            }

            const elements = new Map();
            const categories = new Map();
            const materials = new Set();
            const families = new Set();
            const allDbIds = [];
            
            // Collecter tous les IDs
            tree.enumNodeChildren(tree.getRootId(), (dbId) => {
                allDbIds.push(dbId);
            }, true);

            console.log(`Analyse de ${allDbIds.length} éléments...`);
            
            let processedCount = 0;

            const processElement = (dbId) => {
                this.viewer.getProperties(dbId, (props) => {
                    if (props && props.name) {
                        // Extraire les informations clés
                        const elementInfo = {
                            id: dbId,
                            name: props.name,
                            category: this.extractCategory(props),
                            material: this.extractMaterial(props),
                            family: this.extractFamily(props),
                            type: this.extractType(props),
                            level: this.extractLevel(props),
                            properties: props.properties || []
                        };

                        elements.set(dbId, elementInfo);

                        // Collecter les catégories
                        if (elementInfo.category) {
                            const count = categories.get(elementInfo.category) || 0;
                            categories.set(elementInfo.category, count + 1);
                        }

                        // Collecter les matériaux
                        if (elementInfo.material) {
                            materials.add(elementInfo.material);
                        }

                        // Collecter les familles
                        if (elementInfo.family) {
                            families.add(elementInfo.family);
                        }
                    }
                    
                    processedCount++;
                    
                    if (processedCount >= allDbIds.length) {
                        // Finaliser le parsing
                        this.modelElements = elements;
                        this.modelSummary = this.createModelSummary(elements, categories, materials, families);
                        
                        console.log("Parsing terminé:", {
                            totalElements: elements.size,
                            categories: categories.size,
                            materials: materials.size,
                            families: families.size
                        });
                        
                        resolve();
                    }
                }, (error) => {
                    processedCount++;
                    if (processedCount >= allDbIds.length) {
                        this.modelElements = elements;
                        this.modelSummary = this.createModelSummary(elements, categories, materials, families);
                        resolve();
                    }
                });
            };

            if (allDbIds.length === 0) {
                this.modelElements = new Map();
                this.modelSummary = null;
                resolve();
                return;
            }

            allDbIds.forEach(processElement);
        });
    }

    // Extraire la catégorie de l'élément
    extractCategory(props) {
        const categoryFields = ['Category', 'Catégorie', 'Object Type', 'Type d\'objet', 'Element Type'];
        return this.findPropertyValue(props, categoryFields);
    }

    // Extraire le matériau
    extractMaterial(props) {
        const materialFields = ['Material', 'Matériau', 'Matériel', 'Structural Material', 'Finish Material'];
        return this.findPropertyValue(props, materialFields);
    }

    // Extraire la famille
    extractFamily(props) {
        const familyFields = ['Family', 'Famille', 'Family Name', 'Type Name'];
        return this.findPropertyValue(props, familyFields);
    }

    // Extraire le type
    extractType(props) {
        const typeFields = ['Type', 'Element Type', 'Type Name', 'Nom du type'];
        return this.findPropertyValue(props, typeFields);
    }

    // Extraire le niveau
    extractLevel(props) {
        const levelFields = ['Level', 'Niveau', 'Reference Level', 'Constraint', 'Elevation'];
        return this.findPropertyValue(props, levelFields);
    }

    // Chercher une valeur de propriété par nom
    findPropertyValue(props, fieldNames) {
        if (!props.properties) return null;
        
        for (const fieldName of fieldNames) {
            const prop = props.properties.find(p => 
                p.displayName && p.displayName.toLowerCase().includes(fieldName.toLowerCase())
            );
            if (prop && prop.displayValue && prop.displayValue !== '') {
                return prop.displayValue.toString();
            }
        }
        return null;
    }

    // Créer un résumé du modèle pour le chatbot
    createModelSummary(elements, categories, materials, families) {
        const summary = {
            totalElements: elements.size,
            categories: Array.from(categories.entries()).sort((a, b) => b[1] - a[1]),
            materials: Array.from(materials).sort(),
            families: Array.from(families).sort(),
            elementNames: Array.from(new Set([...elements.values()].map(e => e.name))).sort(),
            levels: Array.from(new Set([...elements.values()].map(e => e.level).filter(l => l))).sort()
        };

        return summary;
    }

    createToolbarButton() {
        console.log("Création du bouton ChatBot dans la toolbar...");
        
        if (!this.viewer.toolbar) {
            console.error("Toolbar non disponible");
            return;
        }

        try {
            // Utiliser le même groupe que OTEIS pour cohérence
            let toolbarGroup = this.viewer.toolbar.getControl('oteis-toolbar-group');
            if (!toolbarGroup) {
                toolbarGroup = new Autodesk.Viewing.UI.ControlGroup('oteis-toolbar-group');
                this.viewer.toolbar.addControl(toolbarGroup);
            }
            this.toolbarGroup = toolbarGroup;
            
            this.button = new Autodesk.Viewing.UI.Button('chatbot-button');
            this.button.setToolTip('Assistant IA');
            
            // Approche plus agressive - remplacer complètement le contenu du bouton
            this.button.setIcon('adsk-icon-help');
            
            // Attendre et forcer l'icône
            setTimeout(() => {
                // Essayer plusieurs sélecteurs
                const buttonElement = this.button.container;
                if (buttonElement) {
                    // Vider complètement le bouton et ajouter notre icône
                    buttonElement.innerHTML = `
                        <div class="adsk-icon" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <!-- Tête du robot - plus grande -->
                                <rect x="4" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                                <!-- Yeux - plus gros -->
                                <circle cx="8" cy="10" r="2" fill="currentColor"/>
                                <circle cx="16" cy="10" r="2" fill="currentColor"/>
                                <!-- Bouche - plus visible -->
                                <rect x="10" y="13.5" width="4" height="1.5" rx="0.7" fill="currentColor"/>
                                <!-- Antennes - plus épaisses -->
                                <line x1="8" y1="5" x2="8" y2="2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <line x1="16" y1="5" x2="16" y2="2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <circle cx="8" cy="2" r="1.2" fill="currentColor"/>
                                <circle cx="16" cy="2" r="1.2" fill="currentColor"/>
                                <!-- Corps - plus visible -->
                                <rect x="7" y="17" width="10" height="4" rx="1.5" fill="currentColor" opacity="0.8"/>
                            </svg>
                        </div>
                    `;
                    
                    // Garder les classes importantes
                    buttonElement.className = 'adsk-button';
                    
                    console.log('Icône du chatbot forcée');
                }
            }, 300);
            
            // Double vérification après un délai plus long
            setTimeout(() => {
                const buttonElement = this.button.container;
                if (buttonElement && !buttonElement.querySelector('svg')) {
                    console.log('Tentative de récupération de l\'icône chatbot');
                    buttonElement.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="4" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                                <circle cx="8" cy="10" r="2" fill="currentColor"/>
                                <circle cx="16" cy="10" r="2" fill="currentColor"/>
                                <rect x="10" y="13.5" width="4" height="1.5" rx="0.7" fill="currentColor"/>
                                <line x1="8" y1="5" x2="8" y2="2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <line x1="16" y1="5" x2="16" y2="2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <circle cx="8" cy="2" r="1.2" fill="currentColor"/>
                                <circle cx="16" cy="2" r="1.2" fill="currentColor"/>
                                <rect x="7" y="17" width="10" height="4" rx="1.5" fill="currentColor" opacity="0.8"/>
                            </svg>
                        </div>
                    `;
                }
            }, 1000);
            
            this.button.onClick = (event) => {
                console.log("Bouton ChatBot cliqué");
                this.togglePanel();
            };
            
            this.toolbarGroup.addControl(this.button);
            this.button.setState(Autodesk.Viewing.UI.Button.State.DISABLED);
            
            console.log("Bouton ChatBot créé avec succès dans la toolbar");
            this.updateButtonState();
            
        } catch (error) {
            console.error("Erreur lors de la création du bouton ChatBot:", error);
            this.createFallbackButton();
        }
    }

    createFallbackButton() {
        console.log("Création d'un bouton ChatBot fallback...");
        
        this.button = document.createElement("button");
        this.button.id = "chatbot-btn";
        this.button.className = "btn btn-primary";
        this.button.title = "Assistant IA - ChatBot";
        this.button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                <circle cx="8" cy="10" r="2" fill="currentColor"/>
                <circle cx="16" cy="10" r="2" fill="currentColor"/>
                <rect x="10" y="13.5" width="4" height="1.5" rx="0.7" fill="currentColor"/>
                <line x1="8" y1="5" x2="8" y2="2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="16" y1="5" x2="16" y2="2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="8" cy="2" r="1.2" fill="currentColor"/>
                <circle cx="16" cy="2" r="1.2" fill="currentColor"/>
                <rect x="7" y="17" width="10" height="4" rx="1.5" fill="currentColor" opacity="0.8"/>
            </svg>
            Assistant IA
        `;
        
        this.button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
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
                this.button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
            } else {
                this.button.disabled = false;
                this.button.style.opacity = "1";
                this.button.style.cursor = "pointer";
            }
            console.log("Bouton ChatBot activé");
        } else {
            if (this.button.setState) {
                this.button.setState(Autodesk.Viewing.UI.Button.State.DISABLED);
            } else {
                this.button.disabled = true;
                this.button.style.opacity = "0.7";
                this.button.style.cursor = "not-allowed";
            }
            console.log("Bouton ChatBot désactivé");
        }
    }

    removeUI() {
        if (this.button) {
            if (this.toolbarGroup && this.button.setState) {
                this.toolbarGroup.removeControl(this.button);
            } else {
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
        console.log("Toggle panel ChatBot");
        
        if (!this.isModelLoaded || !this.viewer.model) {
            this.showError("Aucun modèle chargé. Veuillez charger un modèle 3D pour utiliser l'assistant IA.");
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

    openPanel() {
        console.log("Ouverture du panel ChatBot");
        this.createPanel();
    }

    closePanel() {
        console.log("Fermeture du panel ChatBot");
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
    }

    createPanel() {
        this.panel = document.createElement("div");
        this.panel.className = "chatbot-panel";
        this.panel.style.cssText = `
            position: absolute;
            bottom: 5px;
            left: 20px;
            width: 400px;
            height: auto;
            min-height: 200px;
            max-height: calc(100% - 10px);
            background: var(--bg-color, #ffffff);
            color: var(--text-color, #333333);
            border: 1px solid var(--border-color, #ddd);
            border-radius: 16px;
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // Ajouter le panel au conteneur du viewer
        const viewerContainer = document.getElementById('preview');
        if (viewerContainer) {
            viewerContainer.appendChild(this.panel);
        } else {
            document.body.appendChild(this.panel);
        }

        // Header avec poignée de redimensionnement
        const header = document.createElement("div");
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color, #ddd);
            background: var(--header-bg, #f8f9fa);
            border-radius: 16px 16px 0 0;
            cursor: move;
            position: relative;
        `;
        
        // Ajouter une poignée de redimensionnement visuelle
        const resizeHandle = document.createElement("div");
        resizeHandle.style.cssText = `
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 30px;
            height: 6px;
            background: var(--border-color, #ddd);
            border-radius: 3px;
            cursor: ns-resize;
        `;
        header.appendChild(resizeHandle);

        const title = document.createElement("h3");
        title.textContent = "Assistant IA";
        title.style.cssText = "margin: 0; font-size: 16px; font-weight: 600; color: #333;";

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
            border-radius: 4px;
        `;
        closeBtn.onclick = () => this.togglePanel();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Messages area
        this.messagesContainer = document.createElement("div");
        this.messagesContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            background: #fafafa;
            min-height: 100px;
            max-height: none;
        `;

        // Input area
        const inputArea = document.createElement("div");
        inputArea.style.cssText = `
            display: flex;
            padding: 15px;
            border-top: 1px solid var(--border-color, #ddd);
            background: var(--header-bg, #f8f9fa);
            border-radius: 0 0 12px 12px;
        `;

        this.chatInput = document.createElement("input");
        this.chatInput.type = "text";
        this.chatInput.placeholder = "Demandez-moi d'analyser le modèle...";
        this.chatInput.style.cssText = `
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px 0 0 8px;
            font-size: 14px;
            outline: none;
        `;

        this.sendButton = document.createElement("button");
        this.sendButton.style.cssText = `
            padding: 10px 15px;
            background: #007ACC;
            color: white;
            border: none;
            border-radius: 0 8px 8px 0;
            cursor: pointer;
            font-weight: 500;
        `;
        this.updateSendButton(false);

        // Event listeners
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isProcessing) {
                this.sendMessage();
            }
        });

        this.sendButton.addEventListener('click', () => {
            if (!this.isProcessing) {
                this.sendMessage();
            }
        });

        inputArea.appendChild(this.chatInput);
        inputArea.appendChild(this.sendButton);

        this.panel.appendChild(header);
        this.panel.appendChild(this.messagesContainer);
        this.panel.appendChild(inputArea);

        // Message d'accueil avec contexte du modèle
        this.addWelcomeMessage();
        
        // Ajuster la hauteur initiale
        setTimeout(() => this.adjustPanelHeight(), 100);
    }

    // NOUVELLE MÉTHODE : Message d'accueil avec contexte
    addWelcomeMessage() {
        let welcomeMessage = "Bonjour ! Je suis votre assistant IA pour l'analyse de modèles 3D.";
        
        if (this.modelSummary) {
            welcomeMessage += `\n\nJ'ai analysé votre modèle qui contient :\n`;
            welcomeMessage += `• ${this.modelSummary.totalElements} éléments au total\n`;
            
            if (this.modelSummary.categories.length > 0) {
                welcomeMessage += `• Principales catégories : ${this.modelSummary.categories.slice(0, 5).map(([cat, count]) => `${cat} (${count})`).join(', ')}\n`;
            }
            
            if (this.modelSummary.materials.length > 0) {
                welcomeMessage += `• Matériaux : ${this.modelSummary.materials.slice(0, 5).join(', ')}\n`;
            }
            
            if (this.modelSummary.levels.length > 0) {
                welcomeMessage += `• Niveaux : ${this.modelSummary.levels.slice(0, 3).join(', ')}\n`;
            }
            
            welcomeMessage += `\nJe peux maintenant vous aider précisément avec ce modèle !`;
        } else {
            welcomeMessage += "\n\nAnalyse du modèle en cours... Patientez un instant.";
        }
        
        welcomeMessage += "\n\nQue puis-je faire pour vous ? (isoler, compter, analyser, colorer...)";
        
        this.addMessage("assistant", welcomeMessage);
    }

    addMessage(role, content) {
        const messageDiv = document.createElement("div");
        messageDiv.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            ${role === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
        `;

        const messageContent = document.createElement("div");
        messageContent.style.cssText = `
            max-width: 80%;
            padding: 10px 15px;
            border-radius: 15px;
            font-size: 14px;
            line-height: 1.4;
            white-space: pre-wrap;
            ${role === 'user' ? 
                'background: #007ACC; color: white; border-bottom-right-radius: 5px;' : 
                'background: white; color: #333; border: 1px solid #e0e0e0; border-bottom-left-radius: 5px;'
            }
        `;
        messageContent.textContent = content;

        messageDiv.appendChild(messageContent);
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        // Ajouter à l'historique
        this.chatHistory.push({ role, content });
        
        // Ajuster automatiquement la hauteur du panel
        this.adjustPanelHeight();
    }

    adjustPanelHeight() {
        if (!this.panel || !this.messagesContainer) return;
        
        // Calculer la hauteur nécessaire
        const headerHeight = 60; // Header + padding
        const inputHeight = 60; // Input area + padding
        const messagesHeight = this.messagesContainer.scrollHeight;
        const totalNeeded = headerHeight + messagesHeight + inputHeight + 40; // +40 pour les marges
        
        // Obtenir la hauteur maximale (viewer height - 10px)
        const viewerContainer = document.getElementById('preview');
        const maxHeight = viewerContainer ? viewerContainer.clientHeight - 10 : window.innerHeight - 200;
        
        // Calculer la hauteur optimale
        const optimalHeight = Math.min(totalNeeded, maxHeight);
        const minHeight = 200;
        const finalHeight = Math.max(optimalHeight, minHeight);
        
        // Appliquer la nouvelle hauteur
        this.panel.style.height = finalHeight + 'px';
        
        // Si on atteint la hauteur max, activer le scroll
        if (totalNeeded > maxHeight) {
            this.messagesContainer.style.overflowY = 'auto';
            this.messagesContainer.style.maxHeight = (maxHeight - headerHeight - inputHeight - 40) + 'px';
        } else {
            this.messagesContainer.style.overflowY = 'visible';
            this.messagesContainer.style.maxHeight = 'none';
        }
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isProcessing) return;

        console.log("Envoi du message:", message);
        this.addMessage("user", message);
        this.chatInput.value = '';
        this.isProcessing = true;
        this.updateSendButton(true);

        try {
            const response = await this.callOpenAI(message);
            console.log("Réponse reçue:", response);
            
            this.addMessage("assistant", response.content);
            
            // CRITIQUE : Exécuter les commandes si présentes
            if (response.commands && response.commands.length > 0) {
                console.log("Exécution des commandes:", response.commands);
                await this.executeCommands(response.commands);
            }
        } catch (error) {
            console.error("Erreur ChatBot:", error);
            this.addMessage("assistant", "Désolé, j'ai rencontré une erreur. Veuillez réessayer ou vérifier votre configuration OpenAI.");
        }

        this.isProcessing = false;
        this.updateSendButton(false);
    }

    updateSendButton(isProcessing) {
        if (isProcessing) {
            this.sendButton.innerHTML = `
                <div style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            `;
            this.sendButton.style.cursor = "not-allowed";
            this.sendButton.style.opacity = "0.7";
        } else {
            this.sendButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor"/>
                </svg>
            `;
            this.sendButton.style.cursor = "pointer";
            this.sendButton.style.opacity = "1";
        }
    }

    async callOpenAI(userMessage) {
        const modelInfo = this.getModelContext();
        
        const systemPrompt = `Tu es un assistant IA spécialisé dans l'analyse de modèles 3D via Autodesk Viewer. Tu peux exécuter des commandes pour interagir avec le modèle.

CONTEXTE DU MODÈLE:
${modelInfo}

COMMANDES DISPONIBLES - FORMAT EXACT À RESPECTER:
- {"name": "isolate_elements", "params": {"query": "toit"}} : Isoler des éléments
- {"name": "show_all_elements", "params": {}} : Afficher tous les éléments
- {"name": "count_elements", "params": {"query": "fenêtre"}} : Compter les éléments
- {"name": "search_elements", "params": {"query": "porte"}} : Rechercher des éléments
- {"name": "get_properties", "params": {"elementId": 123}} : Obtenir les propriétés
- {"name": "hide_elements", "params": {"query": "mur"}} : Masquer des éléments
- {"name": "change_color", "params": {"query": "toiture", "color": "#ff0000"}} : Changer la couleur
- {"name": "get_model_info", "params": {}} : Obtenir les infos du modèle
- {"name": "zoom_to_elements", "params": {"query": "escalier"}} : Zoomer sur des éléments

IMPORTANT: 
1. Tu connais maintenant EXACTEMENT quels éléments sont dans le modèle
2. STRATÉGIE DE RECHERCHE OBLIGATOIRE - Dans l'ordre de priorité :
   a) TOUJOURS essayer d'abord les termes ANGLAIS (car la plupart des modèles 3D utilisent l'anglais)
   b) Si aucun résultat, essayer ensuite les termes français
   c) Si toujours aucun résultat, essayer des variantes et synonymes
3. EXEMPLES DE TRADUCTION AUTOMATIQUE À APPLIQUER :
   - "murs" → essayer "wall", "walls", puis "mur", "murs"
   - "toit" → essayer "roof", "roofing", "ceiling", puis "toit", "toiture"
   - "porte" → essayer "door", "doors", puis "porte", "portes"
   - "fenêtre" → essayer "window", "windows", puis "fenêtre", "fenêtres"
   - "sol" → essayer "floor", "floors", "slab", puis "sol", "plancher"
   - "colonne" → essayer "column", "columns", "pillar", puis "colonne", "colonnes"
   - "poutre" → essayer "beam", "beams", puis "poutre", "poutres"
   - "escalier" → essayer "stair", "stairs", "staircase", puis "escalier", "escaliers"
4. Utilise ton intelligence pour mapper les termes français vers les vrais noms d'éléments EN ANGLAIS D'ABORD
5. Si tu veux exécuter des commandes, inclus-les EXACTEMENT dans ce format JSON à la fin de ta réponse:
COMMANDS: [{"name": "nom_commande", "params": {...}}]

Réponds en français de manière naturelle et professionnelle.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                systemPrompt: systemPrompt,
                chatHistory: this.chatHistory.slice(-10)
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }

        return await response.json();
    }

    getModelContext() {
        if (!this.viewer.model) {
            return "Aucun modèle chargé actuellement.";
        }

        let context = `Modèle 3D chargé et analysé.\n`;
        
        if (this.modelSummary) {
            context += `ÉLÉMENTS DISPONIBLES DANS LE MODÈLE:\n`;
            context += `• Total: ${this.modelSummary.totalElements} éléments\n`;
            
            if (this.modelSummary.categories.length > 0) {
                context += `• Catégories: ${this.modelSummary.categories.map(([cat, count]) => `${cat} (${count}x)`).join(', ')}\n`;
            }
            
            if (this.modelSummary.materials.length > 0) {
                context += `• Matériaux: ${this.modelSummary.materials.join(', ')}\n`;
            }
            
            if (this.modelSummary.families.length > 0) {
                context += `• Familles: ${this.modelSummary.families.slice(0, 10).join(', ')}\n`;
            }
            
            if (this.modelSummary.levels.length > 0) {
                context += `• Niveaux: ${this.modelSummary.levels.join(', ')}\n`;
            }
            
            // Échantillon de noms d'éléments réels
            if (this.modelSummary.elementNames.length > 0) {
                context += `• Exemples de noms d'éléments réels: ${this.modelSummary.elementNames.slice(0, 20).join(', ')}\n`;
            }
        } else {
            context += `• En cours d'analyse...`;
        }
        
        return context;
    }

    countAllElements() {
        const tree = this.viewer.model.getData().instanceTree;
        if (!tree) return 0;
        
        let count = 0;
        tree.enumNodeChildren(tree.getRootId(), () => count++, true);
        return count;
    }

    // CRITIQUE : Méthode d'exécution des commandes corrigée
    async executeCommands(commands) {
        console.log("Début de l'exécution des commandes:", commands);
        
        for (const command of commands) {
            try {
                console.log(`Exécution de la commande: ${command.name}`, command.params);
                
                const handler = this.commands.get(command.name);
                if (handler) {
                    await handler(command.params || {});
                    console.log(`Commande ${command.name} exécutée avec succès`);
                } else {
                    console.warn(`Commande inconnue: ${command.name}`);
                    this.addMessage("assistant", `[ERREUR] Commande inconnue: ${command.name}`);
                }
            } catch (error) {
                console.error(`Erreur lors de l'exécution de ${command.name}:`, error);
                this.addMessage("assistant", `[ERREUR] Erreur lors de l'exécution de la commande ${command.name}: ${error.message}`);
            }
        }
    }

    // COMMANDES CORRIGÉES ET ROBUSTES
    async isolateElements(params) {
        console.log("isolateElements appelée avec:", params);
        const query = params.query || params.criteria;
        if (!query) {
            this.addMessage("assistant", "[ATTENTION] Critère de recherche manquant pour l'isolation.");
            return;
        }
        
        const dbIds = await this.findElementsByQuery(query);
        console.log(`Éléments trouvés pour isolation (${query}):`, dbIds);
        
        if (dbIds.length > 0) {
            this.viewer.isolate(dbIds);
            this.addMessage("assistant", `[SUCCÈS] ${dbIds.length} élément(s) isolé(s) avec le critère "${query}".`);
        } else {
            this.addMessage("assistant", `[AUCUN RÉSULTAT] Aucun élément trouvé avec le critère "${query}".`);
        }
    }

    async showAllElements(params) {
        console.log("showAllElements appelée");
        this.viewer.showAll();
        this.addMessage("assistant", "Tous les éléments sont maintenant visibles.");
    }

    async countElements(params) {
        const query = params.query || params.criteria;
        if (!query) {
            const totalElements = this.countAllElements();
            this.addMessage("assistant", `Total des éléments dans le modèle: ${totalElements}`);
            return totalElements;
        }
        
        const dbIds = await this.findElementsByQuery(query);
        this.addMessage("assistant", `${dbIds.length} élément(s) trouvé(s) avec le critère "${query}".`);
        return dbIds.length;
    }

    async searchElements(params) {
        const query = params.query || params.criteria;
        if (!query) {
            this.addMessage("assistant", "Critère de recherche manquant.");
            return [];
        }
        
        const results = await this.findElementsByQuery(query);
        this.addMessage("assistant", `Recherche "${query}": ${results.length} résultat(s) trouvé(s).`);
        
        if (results.length > 0 && results.length <= 5) {
            // Surligner les résultats
            this.viewer.clearThemingColors();
            results.forEach(dbId => {
                this.viewer.setThemingColor(dbId, new THREE.Vector4(1, 1, 0, 0.5)); // Jaune
            });
        }
        
        return results;
    }

    async getElementProperties(params) {
        const elementId = params.elementId || params.dbId;
        if (!elementId) {
            this.addMessage("assistant", "ID d'élément manquant.");
            return null;
        }
        
        return new Promise((resolve) => {
            this.viewer.getProperties(elementId, (props) => {
                const formattedProps = this.formatProperties(props);
                this.addMessage("assistant", `Propriétés de l'élément ${elementId}:\n${formattedProps}`);
                resolve(props);
            }, (error) => {
                this.addMessage("assistant", `Impossible de récupérer les propriétés de l'élément ${elementId}.`);
                resolve(null);
            });
        });
    }

    async hideElements(params) {
        const query = params.query || params.criteria;
        if (!query) {
            this.addMessage("assistant", "Critère de recherche manquant pour masquer.");
            return;
        }
        
        const dbIds = await this.findElementsByQuery(query);
        if (dbIds.length > 0) {
            this.viewer.hide(dbIds);
            this.addMessage("assistant", `${dbIds.length} élément(s) masqué(s) avec le critère "${query}".`);
        } else {
            this.addMessage("assistant", `[AUCUN RÉSULTAT] Aucun élément trouvé avec le critère "${query}".`);
        }
    }

    async changeElementColor(params) {
        const query = params.query || params.criteria;
        const color = params.color || "#ff0000";
        
        if (!query) {
            this.addMessage("assistant", "Critère de recherche manquant pour changer la couleur.");
            return;
        }
        
        const dbIds = await this.findElementsByQuery(query);
        if (dbIds.length > 0) {
            const colorVector = this.hexToRgb(color);
            dbIds.forEach(dbId => {
                this.viewer.setThemingColor(dbId, colorVector);
            });
            this.addMessage("assistant", `Couleur changée pour ${dbIds.length} élément(s) avec le critère "${query}".`);
        } else {
            this.addMessage("assistant", `[AUCUN RÉSULTAT] Aucun élément trouvé avec le critère "${query}".`);
        }
    }

    async getModelInfo(params) {
        const totalElements = this.countAllElements();
        const modelData = this.viewer.model.getData();
        
        let info = `Informations du modèle:\n`;
        info += `• Éléments total: ${totalElements}\n`;
        info += `• Modèle chargé: ${this.viewer.model ? 'Oui' : 'Non'}\n`;
        
        if (modelData.metadata) {
            info += `• Métadonnées disponibles: Oui\n`;
        }
        
        this.addMessage("assistant", info);
        return { totalElements, hasModel: !!this.viewer.model };
    }

    async zoomToElements(params) {
        const query = params.query || params.criteria;
        if (!query) {
            this.addMessage("assistant", "Critère de recherche manquant pour le zoom.");
            return;
        }
        
        const dbIds = await this.findElementsByQuery(query);
        if (dbIds.length > 0) {
            this.viewer.fitToView(dbIds);
            this.addMessage("assistant", `Zoom sur ${dbIds.length} élément(s) avec le critère "${query}".`);
        } else {
            this.addMessage("assistant", `[AUCUN RÉSULTAT] Aucun élément trouvé avec le critère "${query}".`);
        }
    }

    async getLayers(params) {
        this.addMessage("assistant", "🔧 Fonctionnalité des couches en cours de développement.");
    }

    async toggleLayer(params) {
        const layerName = params.layerName || params.name;
        this.addMessage("assistant", `Basculement de la couche "${layerName}" en cours de développement.`);
    }

    async measureDistance(params) {
        try {
            await this.viewer.loadExtension('Autodesk.Measure');
            this.addMessage("assistant", "Outil de mesure activé. Cliquez sur deux points pour mesurer la distance.");
        } catch (error) {
            this.addMessage("assistant", "Impossible de charger l'outil de mesure.");
        }
    }

    async createSection(params) {
        try {
            await this.viewer.loadExtension('Autodesk.Section');
            this.addMessage("assistant", "Outil de coupe activé. Utilisez les contrôles pour créer une section.");
        } catch (error) {
            this.addMessage("assistant", "Impossible de charger l'outil de coupe.");
        }
    }

    // FONCTIONS UTILITAIRES CORRIGÉES
    async findElementsByQuery(query) {
        return new Promise(async (resolve) => {
            if (!this.viewer.model || !query) {
                resolve([]);
                return;
            }

            // Générer les variantes de recherche (anglais en premier)
            const searchTerms = this.generateSearchTerms(query);
            console.log(`Recherche pour "${query}" avec les termes:`, searchTerms);

            let allResults = [];
            
            // Essayer chaque terme de recherche jusqu'à trouver des résultats
            for (const searchTerm of searchTerms) {
                const results = await this.searchByTerm(searchTerm);
                if (results.length > 0) {
                    console.log(`Résultats trouvés avec le terme "${searchTerm}": ${results.length} éléments`);
                    allResults = results;
                    break;
                }
            }

            resolve(allResults);
        });
    }

    generateSearchTerms(frenchTerm) {
        const termLower = frenchTerm.toLowerCase();
        const translations = {
            'mur': ['wall', 'walls'],
            'murs': ['wall', 'walls'],
            'toit': ['roof', 'roofing', 'ceiling'],
            'toiture': ['roof', 'roofing', 'ceiling'],
            'porte': ['door', 'doors'],
            'portes': ['door', 'doors'],
            'fenêtre': ['window', 'windows'],
            'fenêtres': ['window', 'windows'],
            'sol': ['floor', 'floors', 'slab'],
            'plancher': ['floor', 'floors', 'slab'],
            'colonne': ['column', 'columns', 'pillar'],
            'colonnes': ['column', 'columns', 'pillar'],
            'poutre': ['beam', 'beams'],
            'poutres': ['beam', 'beams'],
            'escalier': ['stair', 'stairs', 'staircase'],
            'escaliers': ['stair', 'stairs', 'staircase'],
            'cloison': ['partition', 'wall', 'walls'],
            'dalle': ['slab', 'floor', 'floors'],
            'fondation': ['foundation', 'footing'],
            'fondations': ['foundation', 'footing'],
            'plafond': ['ceiling', 'roof']
        };

        let searchTerms = [];
        
        // 1. Ajouter d'abord les traductions anglaises si elles existent
        if (translations[termLower]) {
            searchTerms.push(...translations[termLower]);
        }
        
        // 2. Ajouter le terme original
        searchTerms.push(termLower);
        
        // 3. Si pas de traduction trouvée, ajouter des variantes communes
        if (!translations[termLower]) {
            // Essayer des variantes pluriel/singulier
            if (termLower.endsWith('s')) {
                searchTerms.push(termLower.slice(0, -1)); // enlever le 's'
            } else {
                searchTerms.push(termLower + 's'); // ajouter un 's'
            }
        }

        // Supprimer les doublons
        return [...new Set(searchTerms)];
    }

    // Méthode pour rechercher avec un terme spécifique
    async searchByTerm(searchTerm) {
        return new Promise((resolve) => {
            const tree = this.viewer.model.getData().instanceTree;
            if (!tree) {
                resolve([]);
                return;
            }

            const results = [];
            const allDbIds = [];
            
            // Collecter tous les IDs
            tree.enumNodeChildren(tree.getRootId(), (dbId) => {
                allDbIds.push(dbId);
            }, true);

            let processedCount = 0;
            const queryLower = searchTerm.toLowerCase();

            if (allDbIds.length === 0) {
                resolve([]);
                return;
            }

            const processElement = (dbId) => {
                this.viewer.getProperties(dbId, (props) => {
                    if (this.matchesQuery(props, queryLower)) {
                        results.push(dbId);
                    }
                    processedCount++;
                    
                    if (processedCount >= allDbIds.length) {
                        resolve(results);
                    }
                }, (error) => {
                    processedCount++;
                    if (processedCount >= allDbIds.length) {
                        resolve(results);
                    }
                });
            };

            allDbIds.forEach(processElement);
        });
    }

    matchesQuery(props, queryLower) {
        if (!props || !queryLower) return false;

        // Recherche dans le nom
        if (props.name && props.name.toLowerCase().includes(queryLower)) {
            return true;
        }

        // Recherche dans les propriétés
        if (props.properties && props.properties.length > 0) {
            return props.properties.some(prop => {
                const displayName = prop.displayName ? prop.displayName.toLowerCase() : '';
                const displayValue = prop.displayValue ? prop.displayValue.toString().toLowerCase() : '';
                return displayName.includes(queryLower) || displayValue.includes(queryLower);
            });
        }

        return false;
    }

    formatProperties(props) {
        let result = `Nom: ${props.name || 'N/A'}\n`;
        if (props.properties && props.properties.length > 0) {
            result += props.properties.slice(0, 5).map(prop => 
                `• ${prop.displayName}: ${prop.displayValue}`
            ).join('\n');
            if (props.properties.length > 5) {
                result += `\n... et ${props.properties.length - 5} propriété(s) de plus`;
            }
        }
        return result;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? new THREE.Vector4(
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            0.8
        ) : new THREE.Vector4(1, 0, 0, 0.8);
    }

    showError(message) {
        if (this.panel) {
            this.addMessage("assistant", `${message}`);
        } else {
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
}

Autodesk.Viewing.theExtensionManager.registerExtension(
    "ChatBotExtension",
    ChatBotExtension
); 