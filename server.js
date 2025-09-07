const express = require('express');
const { PORT } = require('./config.js');

let app = express();

// Middleware pour parser le JSON des requêtes POST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('wwwroot'));
app.use(require('./routes/auth.js'));
app.use(require('./routes/models.js'));
app.listen(PORT, function () { console.log(`Server listening on port ${PORT}...`); });
