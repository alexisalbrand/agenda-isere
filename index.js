// ─── POINT D'ENTRÉE DU SCRAPING ──────────────────────────────────────────────
// Ce fichier est appelé par le serveur via : node index.js [clé-théâtre]
//
// Sans argument  → scrape tous les théâtres (main)
// Avec argument  → scrape uniquement ce théâtre (scrapeOne)
//
// Exemple : node index.js grandAngle
// ─────────────────────────────────────────────────────────────────────────────

import { main, scrapeOne } from "./src/main.js";

const theater = process.argv[2]; // argument passé en ligne de commande
if (theater) scrapeOne(theater).catch(console.error);
else main().catch(console.error);
