// ─── SERVEUR EXPRESS ─────────────────────────────────────────────────────────
// Ce fichier est le serveur web. Il fait deux choses :
//   1. Sert les fichiers statiques (index.html, all-events.json, etc.)
//   2. Expose deux routes API :
//
//   GET /api/scrape-stream/:theater
//     Lance le scraping d'un théâtre (ou de tous si :theater = "all")
//     Renvoie les logs en temps réel via Server-Sent Events (SSE)
//     → le navigateur reçoit les messages au fur et à mesure
//
//   GET /api/status
//     Retourne la liste des scrapers en cours + la date du dernier refresh
//     par théâtre (lue depuis theater-status.json)
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000; // Render injecte PORT automatiquement
const STATUS_FILE = path.join(__dirname, "theater-status.json");

// Sert tous les fichiers du dossier (index.html, all-events.json, images...)
app.use(express.static(__dirname));

// Set contenant les clés des théâtres en cours de scraping
// Empêche de lancer deux scrapings simultanés pour le même théâtre
const scraping = new Set();

// Lit le fichier de statut (dates de dernier refresh par théâtre)
function loadStatus() {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8")); } catch { return {}; }
}

// Sauvegarde le fichier de statut
function saveStatus(status) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf-8");
}

// ── Route de scraping ────────────────────────────────────────────────────────
// Utilise Server-Sent Events (SSE) : connexion longue durée où le serveur
// envoie des messages au client au fur et à mesure (pas de WebSocket nécessaire)
// Chaque message a un type : "log", "warn", "done" ou "error"
app.get("/api/scrape-stream/:theater", (req, res) => {
  const theater = req.params.theater || "all";

  // Headers SSE obligatoires
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Fonction utilitaire pour envoyer un message SSE au client
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  // Vérifie qu'un scraping n'est pas déjà en cours pour ce théâtre
  if (scraping.has(theater)) {
    send({ type: "error", message: "Scraping déjà en cours" });
    return res.end();
  }
  scraping.add(theater);

  // Lance node index.js [clé] en sous-processus
  // "all" → node index.js (scrape tout)
  // autre → node index.js grandAngle (scrape un seul)
  const ALL_KEYS = ["grandAngle","mc2","vellein","hexagone","rampe","ilyade","ponsard","agora","diapason","theatreEnRond","heureBleue","faiencerie","manege","grenoble","summum","laussy","venceScene","atrium","morgado","tourDuPin"];
  const args = theater === "all" ? ["index.js"] : ["index.js", theater];
  const child = spawn("node", args, { cwd: __dirname });
  const errors = [];

  // Transmet les logs stdout du scraper vers le client en temps réel
  child.stdout.on("data", (d) => {
    d.toString().split("\n").filter(Boolean).forEach(line => send({ type: "log", message: line }));
  });

  // Transmet les erreurs stderr (avertissements non bloquants)
  child.stderr.on("data", (d) => {
    d.toString().split("\n").filter(Boolean).forEach(line => {
      errors.push(line);
      send({ type: "warn", message: line });
    });
  });

  // Quand le sous-processus se termine : sauvegarde le statut et notifie le client
  child.on("close", (code) => {
    scraping.delete(theater);
    const now = new Date().toISOString();
    let savedStatus = {};
    try {
      const status = loadStatus();
      // "all" → met à jour tous les théâtres, sinon juste celui concerné
      const keys = theater === "all" ? ALL_KEYS : [theater];
      for (const k of keys) status[k] = now;
      savedStatus = status;
      saveStatus(status);
      console.log("Status sauvegardé pour:", keys);
    } catch (e) {
      console.error("Erreur sauvegarde status:", e.message);
    }
    // Envoie l'événement "done" avec le statut mis à jour
    // Le frontend utilise theaterStatus pour mettre à jour les dates directement
    send({ type: "done", code, errors, theater, theaterStatus: savedStatus });
    res.end();
  });

  // Si le client ferme la connexion (fermeture onglet, etc.) → arrête le scraping
  req.on("close", () => { child.kill(); scraping.delete(theater); });
});

// ── Route de statut ──────────────────────────────────────────────────────────
// Retourne l'état actuel : quels scrapers tournent + dates de dernier refresh
app.get("/api/status", (req, res) => {
  const status = loadStatus();
  res.json({ scraping: [...scraping], theaterStatus: status });
});

app.listen(PORT, () => console.log(`Serveur démarré → http://localhost:${PORT}`));
