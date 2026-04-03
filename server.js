import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const STATUS_FILE = path.join(__dirname, "theater-status.json");

app.use(express.static(__dirname));

const scraping = new Set();

function loadStatus() {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8")); } catch { return {}; }
}

function saveStatus(status) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf-8");
}

app.get("/api/scrape-stream/:theater", (req, res) => {
  const theater = req.params.theater || "all";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  if (scraping.has(theater)) {
    send({ type: "error", message: "Scraping déjà en cours" });
    return res.end();
  }
  scraping.add(theater);

  const args = theater === "all" ? ["index.js"] : ["index.js", theater];
  const child = spawn("node", args, { cwd: __dirname });
  const errors = [];

  child.stdout.on("data", (d) => {
    d.toString().split("\n").filter(Boolean).forEach(line => send({ type: "log", message: line }));
  });

  child.stderr.on("data", (d) => {
    d.toString().split("\n").filter(Boolean).forEach(line => {
      errors.push(line);
      send({ type: "warn", message: line });
    });
  });

  const ALL_KEYS = ["grandAngle","mc2","vellein","hexagone","rampe","ilyade","ponsard","agora","diapason","theatreEnRond","heureBleue","faiencerie","manege","grenoble","summum"];

  child.on("close", (code) => {
    scraping.delete(theater);
    const now = new Date().toISOString();
    let savedStatus = {};
    try {
      const status = loadStatus();
      const keys = theater === "all" ? ALL_KEYS : [theater];
      for (const k of keys) status[k] = now;
      savedStatus = status;
      saveStatus(status);
      console.log("Status sauvegardé pour:", keys);
    } catch (e) {
      console.error("Erreur sauvegarde status:", e.message);
    }
    send({ type: "done", code, errors, theater, theaterStatus: savedStatus });
    res.end();
  });

  req.on("close", () => { child.kill(); scraping.delete(theater); });
});

app.get("/api/status", (req, res) => {
  const status = loadStatus();
  res.json({ scraping: [...scraping], theaterStatus: status });
});

app.listen(PORT, () => console.log(`Serveur démarré → http://localhost:${PORT}`));
