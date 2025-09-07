const express = require('express');
const OpenAI = require('openai');
const { getViewerToken } = require('../services/aps.js');

let router = express.Router();

// Initialiser le client OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.get('/api/auth/token', async function (req, res, next) {
    try {
        res.json(await getViewerToken());
    } catch (err) {
        next(err);
    }
});

// Route pour le chatbot avec OpenAI
router.post('/api/chat', async function (req, res, next) {
    try {
        const { message, systemPrompt, chatHistory } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Vérifier si la clé API OpenAI est configurée
        if (!process.env.OPENAI_API_KEY) {
            console.error('OPENAI_API_KEY not found in environment variables');
            return res.status(500).json({ 
                error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
            });
        }

        console.log('Processing chat request with OpenAI SDK...');

        // Préparer les messages pour OpenAI
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Ajouter l'historique récent
        if (chatHistory && chatHistory.length > 0) {
            chatHistory.slice(-5).forEach(msg => {
                messages.push({ role: msg.role, content: msg.content });
            });
        }

        // Ajouter le message actuel
        messages.push({ role: 'user', content: message });

        console.log('Sending request to OpenAI with', messages.length, 'messages');

        // Appeler l'API OpenAI avec le SDK officiel
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            max_tokens: 1000,
            temperature: 0.7,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        });

        console.log('OpenAI response received successfully');
        
        if (!completion.choices || completion.choices.length === 0) {
            throw new Error('No response from OpenAI');
        }

        const assistantMessage = completion.choices[0].message.content;

        // Parser les commandes si présentes
        const commands = parseCommands(assistantMessage);

        res.json({
            content: assistantMessage,
            commands: commands,
            usage: completion.usage
        });

    } catch (err) {
        console.error('Chat API Error:', err);
        res.status(500).json({ 
            error: 'Failed to process chat request',
            details: err.message 
        });
    }
});

// Fonction pour parser les commandes dans la réponse du chatbot
function parseCommands(text) {
    const commands = [];
    
    // Rechercher les blocs de commandes JSON
    const commandRegex = /COMMANDS:\s*(\[[\s\S]*?\])/gi;
    const matches = text.match(commandRegex);
    
    if (matches) {
        matches.forEach(match => {
            try {
                const jsonPart = match.replace(/COMMANDS:\s*/i, '').trim();
                const parsedCommands = JSON.parse(jsonPart);
                if (Array.isArray(parsedCommands)) {
                    commands.push(...parsedCommands);
                }
            } catch (error) {
                console.warn('Failed to parse command:', match, error);
            }
        });
    }

    return commands;
}

module.exports = router;
