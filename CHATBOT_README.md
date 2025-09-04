# 🤖 ChatBot IA avec OpenAI - Visionneuse 3D

## 🚀 Fonctionnalités

Le chatbot intégré utilise **GPT-4o** pour comprendre vos demandes en langage naturel et exécuter des actions directement dans la visionneuse 3D Autodesk.

### ✨ Capacités du ChatBot

- **🔍 Analyse intelligente** : Comprend vos questions sur le modèle 3D
- **🎯 Isolation d'éléments** : Isole des composants selon vos critères
- **📊 Comptage automatique** : Compte les éléments par type, matériau, etc.
- **🔎 Recherche avancée** : Trouve des éléments par nom ou propriétés
- **🎨 Modification visuelle** : Change les couleurs, masque/affiche des éléments
- **📏 Mesures et coupes** : Active les outils de mesure et de section
- **📋 Lecture des propriétés** : Extrait les informations des composants
- **🏗️ Gestion des couches** : Contrôle la visibilité des couches

## ⚙️ Configuration

### 1. Clé API OpenAI

Vous devez obtenir une clé API OpenAI et la configurer :

1. Créez un compte sur [OpenAI Platform](https://platform.openai.com/)
2. Générez une clé API dans la section "API Keys"
3. Ajoutez la clé à votre fichier `.env` :

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Variables d'environnement

Créez un fichier `.env` à la racine du projet avec :

```env
# Autodesk Platform Services
APS_CLIENT_ID=your_aps_client_id_here
APS_CLIENT_SECRET=your_aps_client_secret_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Configuration serveur
PORT=8080
```

## 🎮 Utilisation

### 1. Démarrage

```bash
npm install
npm start
```

### 2. Interface

1. **Chargez un modèle 3D** dans la visionneuse
2. **Cliquez sur l'icône robot 🤖** dans la toolbar
3. **Posez vos questions** dans le chat

### 3. Exemples de commandes

#### 🔍 Analyse et comptage
```
"Combien y a-t-il de murs dans ce modèle ?"
"Trouve tous les éléments en béton"
"Isole les fenêtres du bâtiment"
```

#### 🎯 Actions visuelles
```
"Cache tous les éléments sauf les murs"
"Change la couleur des poutres en rouge"
"Zoom sur les éléments structurels"
```

#### 📊 Informations
```
"Quelles sont les propriétés de cet élément ?"
"Donne-moi les dimensions de ce mur"
"Liste les matériaux utilisés"
```

#### 🛠️ Outils
```
"Active l'outil de mesure"
"Crée une coupe transversale"
"Affiche toutes les couches"
```

## 🧠 Fonctionnement Technique

### Architecture
```
Interface Utilisateur
       ↓
Extension ChatBot
       ↓
API Backend (/api/chat)
       ↓
OpenAI GPT-4o
       ↓
Commandes exécutées sur le viewer
```

### Commandes disponibles

Le chatbot peut exécuter ces commandes automatiquement :

- `isolate_elements(criteria)` - Isoler des éléments
- `show_all_elements()` - Afficher tous les éléments
- `count_elements(criteria)` - Compter les éléments
- `search_elements(query)` - Rechercher des éléments
- `get_properties(elementId)` - Obtenir les propriétés
- `hide_elements(criteria)` - Masquer des éléments
- `change_color(criteria, color)` - Changer les couleurs
- `zoom_to_elements(criteria)` - Zoomer sur des éléments
- `measure_distance()` - Activer les mesures
- `create_section()` - Créer des sections

## 🎨 Design Glassmorphism

Le chatbot s'intègre parfaitement avec le design glassmorphism :

- **Transparence** : Arrière-plan semi-transparent avec flou
- **Animations fluides** : Transitions et effets de survol
- **Style moderne** : Interface épurée et élégante
- **Responsive** : Adapté aux écrans mobiles et desktop

## 🔧 Dépannage

### Erreurs communes

**"OpenAI API key not configured"**
- Vérifiez que `OPENAI_API_KEY` est défini dans `.env`
- Redémarrez le serveur après modification

**"Failed to process chat request"**
- Vérifiez votre connexion internet
- Contrôlez que votre clé API OpenAI est valide
- Vérifiez les quotas de votre compte OpenAI

**Le bouton n'apparaît pas**
- Vérifiez la console du navigateur pour les erreurs
- Assurez-vous qu'un modèle 3D est chargé

### Logs de débogage

Ouvrez la console du navigateur (F12) pour voir :
- Chargement de l'extension ChatBot
- Création du bouton dans la toolbar
- Requêtes API et réponses

## 💡 Conseils d'utilisation

1. **Soyez spécifique** : "Isole les murs du 2ème étage" plutôt que "isole des murs"
2. **Utilisez le contexte** : Le chatbot comprend le modèle actuellement chargé
3. **Phrases naturelles** : Parlez comme à un collègue technique
4. **Combinez les actions** : "Compte les fenêtres et change leur couleur en bleu"

## 🔄 Mises à jour

Le chatbot utilise **GPT-4o** qui est continuellement amélioré par OpenAI. Les capacités peuvent s'étendre automatiquement sans modification du code.

## 🆘 Support

En cas de problème :
1. Vérifiez la console du navigateur
2. Contrôlez les logs du serveur
3. Testez avec un modèle 3D simple
4. Vérifiez votre configuration OpenAI

Votre assistant IA est maintenant prêt à vous aider dans l'analyse de vos modèles 3D ! 🚀 