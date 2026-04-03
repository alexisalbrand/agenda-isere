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

const PLACEHOLDER = "https://placehold.co/600x400/e2e8f0/94a3b8?text=Pas+d%27image";

const launchOpts = {
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
};

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
];

function normalize(events) {
  return events.map(e => ({ ...e, image: e.image || PLACEHOLDER, dateISO: toDateISO(e.date) }));
}

function mergeIntoFile(newEvents, lieu) {
  let all = [];
  try { all = JSON.parse(fs.readFileSync("all-events.json", "utf-8")); } catch {}
  const kept = all.filter(e => e.lieu !== lieu);
  fs.writeFileSync("all-events.json", JSON.stringify([...kept, ...newEvents], null, 2), "utf-8");
}

export async function scrapeOne(key) {
  const theater = THEATERS.find(t => t.key === key);
  if (!theater) throw new Error(`Théâtre inconnu : ${key}`);

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
        console.error(`Erreur ${theater.label} : ${err.message}`);
      }
    }
    fs.writeFileSync("all-events.json", JSON.stringify(allEvents, null, 2), "utf-8");
    console.log(`Total : ${allEvents.length} événements`);
  } finally {
    await browser.close();
  }
}
