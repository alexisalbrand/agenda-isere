// ─── ORCHESTRATEUR DU SCRAPING ───────────────────────────────────────────────
// Ce fichier est le cœur du scraping. Il expose deux fonctions :
//
//   main()       → scrape TOUS les théâtres d'un coup (un seul navigateur)
//   scrapeOne(key) → scrape UN SEUL théâtre et fusionne ses données dans
//                    all-events.json sans écraser les autres théâtres
//
// La liste THEATERS centralise la configuration de chaque théâtre :
//   key          → identifiant interne (utilisé dans les URLs et le stockage)
//   label        → nom affiché dans l'interface
//   lieu         → valeur du champ "lieu" sur chaque événement
//   needsBrowser → true si le scraper nécessite Puppeteer
//   scrape       → fonction à appeler (reçoit le browser si needsBrowser)
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import puppeteer from "puppeteer";
import { toDateISO } from "./utils.js";
import { scrapeGrandAngleAllPages } from "./scrapers/grandAngle.js";
import { scrapemc2AllPages } from "./scrapers/mc2.js";
import { scrapeVellein } from "./scrapers/vellein.js";
import { scrapeHexagone } from "./scrapers/hexagone.js";
import { scrapeRampe } from "./scrapers/rampe.js";
import { scrapeIlyade } from "./scrapers/ilyade.js";
import { scrapePonsard } from "./scrapers/ponsard.js";
import { scrapeAgora } from "./scrapers/agora.js";
import { scrapeDiapason } from "./scrapers/diapason.js";
import { scrapeTheatreEnRond } from "./scrapers/theatreEnRond.js";
import { scrapeHeureBleue } from "./scrapers/heureBleue.js";
import { scrapeFaiencerie } from "./scrapers/faiencerie.js";
import { scrapeManege } from "./scrapers/manege.js";
import { scrapeGrenoble } from "./scrapers/grenoble.js";
import { scrapeSummum } from "./scrapers/summum.js";
import { scrapeLaussy } from "./scrapers/laussy.js";
import { scrapeVenceScene } from "./scrapers/venceScene.js";
import { scrapeAtrium } from "./scrapers/atrium.js";
import { scrapeMorgado } from "./scrapers/morgado.js";
import { scrapeTourDuPin } from "./scrapers/tourDuPin.js";

const PLACEHOLDER = "https://placehold.co/600x400/e2e8f0/94a3b8?text=Pas+d%27image";

// Options de lancement Puppeteer (communes à tous les scrapers)
// --no-sandbox et --disable-setuid-sandbox sont requis sur Linux (Render)
// --disable-dev-shm-usage évite les crashes mémoire
const launchOpts = {
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  ignoreHTTPSErrors: true, // nécessaire pour Espace Morgado (certificat auto-signé)
};

// Liste de tous les théâtres avec leur configuration
export const THEATERS = [
  { key: "grandAngle",    label: "Le Grand Angle",            lieu: "Le Grand Angle",            scrape: ()  => scrapeGrandAngleAllPages() },
  { key: "mc2",           label: "MC2 Grenoble",              lieu: "MC2 Grenoble",              scrape: ()  => scrapemc2AllPages() },
  { key: "vellein",       label: "Le Vellein",                lieu: "Le Vellein",                scrape: (b) => scrapeVellein(b),       needsBrowser: true },
  { key: "hexagone",      label: "Hexagone",                  lieu: "Hexagone",                  scrape: (b) => scrapeHexagone(b),      needsBrowser: true },
  { key: "rampe",         label: "La Rampe",                  lieu: "La Rampe",                  scrape: ()  => scrapeRampe() },
  { key: "ilyade",        label: "L'ilyade",                  lieu: "L'ilyade",                  scrape: (b) => scrapeIlyade(b),        needsBrowser: true },
  { key: "ponsard",       label: "Théâtre François Ponsard",  lieu: "Théâtre François Ponsard",  scrape: (b) => scrapePonsard(b),       needsBrowser: true },
  { key: "agora",         label: "Agora Saint-Ismier",        lieu: "Agora Saint-Ismier",        scrape: (b) => scrapeAgora(b),         needsBrowser: true },
  { key: "diapason",      label: "Diapason Saint-Marcellin",  lieu: "Diapason Saint-Marcellin",  scrape: (b) => scrapeDiapason(b),      needsBrowser: true },
  { key: "theatreEnRond", label: "Théâtre en Rond",           lieu: "Théâtre en Rond",           scrape: ()  => scrapeTheatreEnRond() },
  { key: "heureBleue",    label: "L'Heure Bleue",             lieu: "L'Heure Bleue",             scrape: ()  => scrapeHeureBleue() },
  { key: "faiencerie",    label: "La Faïencerie",             lieu: "La Faïencerie",             scrape: ()  => scrapeFaiencerie() },
  { key: "manege",        label: "Manège de Vienne",          lieu: "Manège de Vienne",          scrape: ()  => scrapeManege() },
  { key: "grenoble",      label: "TMG",                       lieu: "TMG",                       scrape: ()  => scrapeGrenoble() },
  { key: "summum",        label: "Summum",                    lieu: "Summum",                    scrape: ()  => scrapeSummum() },
  { key: "laussy",        label: "Le Laussy",                 lieu: "Le Laussy",                 scrape: ()  => scrapeLaussy() },
  { key: "venceScene",    label: "La Vence Scène",            lieu: "La Vence Scène",            scrape: ()  => scrapeVenceScene() },
  { key: "atrium",        label: "Atrium de Fontanil",         lieu: "Atrium de Fontanil",         scrape: ()  => scrapeAtrium() },
  { key: "morgado",       label: "Espace Morgado",             lieu: "Espace Morgado",             scrape: (b) => scrapeMorgado(b),       needsBrowser: true },
  { key: "tourDuPin",    label: "La Tour du Pin",             lieu: "La Tour du Pin",             scrape: (b) => scrapeTourDuPin(b),     needsBrowser: true },
];

// Ajoute l'image placeholder et convertit la date en ISO pour chaque événement
function normalize(events) {
  return events.map(e => ({ ...e, image: e.image || PLACEHOLDER, dateISO: toDateISO(e.date) }));
}

// Lit all-events.json, remplace les événements du théâtre concerné, réécrit le fichier
// Permet de mettre à jour un seul théâtre sans écraser les autres
function mergeIntoFile(newEvents, lieu) {
  let all = [];
  try { all = JSON.parse(fs.readFileSync("all-events.json", "utf-8")); } catch {}
  const kept = all.filter(e => e.lieu !== lieu); // on supprime les anciens événements de ce théâtre
  fs.writeFileSync("all-events.json", JSON.stringify([...kept, ...newEvents], null, 2), "utf-8");
}

// Scrape un seul théâtre par sa clé et fusionne dans all-events.json
export async function scrapeOne(key) {
  const theater = THEATERS.find(t => t.key === key);
  if (!theater) throw new Error(`Théâtre inconnu : ${key}`);

  // Lance Puppeteer seulement si le scraper en a besoin
  let browser;
  if (theater.needsBrowser) browser = await puppeteer.launch(launchOpts);
  try {
    const events = normalize(await theater.scrape(browser));
    mergeIntoFile(events, theater.lieu);
    console.log(`${theater.label} : ${events.length} événements`);
  } finally {
    if (browser) await browser.close();
  }
}

// Scrape tous les théâtres séquentiellement (l'un après l'autre)
// Un seul navigateur Puppeteer est partagé pour économiser la mémoire
export async function main() {
  const browser = await puppeteer.launch(launchOpts);
  try {
    const allEvents = [];
    for (const theater of THEATERS) {
      try {
        const events = normalize(await theater.scrape(browser));
        allEvents.push(...events);
        console.log(`${theater.label} : ${events.length} événements`);
      } catch (err) {
        // Si un théâtre plante, on continue avec les suivants
        console.error(`Erreur ${theater.label} : ${err.message}`);
      }
    }
    // Écrase complètement all-events.json avec tous les événements
    fs.writeFileSync("all-events.json", JSON.stringify(allEvents, null, 2), "utf-8");
    console.log(`Total : ${allEvents.length} événements`);
  } finally {
    await browser.close();
  }
}
