import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

let scraping = false;

app.get("/api/scrape-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  if (scraping) {
    send({ type: "error", message: "Scraping déjà en cours" });
    return res.end();
  }
  scraping = true;

  const child = spawn("node", ["index.js"], { cwd: __dirname });
  const errors = [];

  child.stdout.on("data", (d) => {
    process.stdout.write(d);
    d.toString().split("\n").filter(Boolean).forEach(line => send({ type: "log", message: line }));
  });

  child.stderr.on("data", (d) => {
    process.stderr.write(d);
    d.toString().split("\n").filter(Boolean).forEach(line => {
      errors.push(line);
      send({ type: "warn", message: line });
    });
  });

  child.on("close", (code) => {
    scraping = false;
    send({ type: "done", code, errors });
    res.end();
  });

  req.on("close", () => { if (scraping) child.kill(); });
});

app.get("/api/status", (req, res) => {
  const jsonPath = path.join(__dirname, "all-events.json");
  if (!fs.existsSync(jsonPath)) {
    return res.json({ scraping, lastRefresh: null });
  }
  const { mtime } = fs.statSync(jsonPath);
  res.json({ scraping, lastRefresh: mtime });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré → http://localhost:${PORT}`);
});
