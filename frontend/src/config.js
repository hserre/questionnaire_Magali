// Préfixe de l'expérience sur le serveur, fixé par "base" dans vite.config.js
// (ex. "/questionnaire/" : l'expérience est sur http://adresse/questionnaire/).
// API_URL = préfixe sans la barre finale, devant toutes les adresses /api/...
export const BASE = import.meta.env.BASE_URL;
export const API_URL = BASE.replace(/\/$/, "");
