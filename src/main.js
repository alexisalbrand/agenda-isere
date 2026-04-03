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

export async function main() {
  const launchOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  };
  const browser = await puppeteer.launch(launchOpts);

  const grandAngleEvents = await scrapeGrandAngleAllPages();
  const mc2Events = await scrapemc2AllPages();
  const velleinEvents = await scrapeVellein(browser);
  const rampeEvents = await scrapeRampe();
  const ilyadeEvents = await scrapeIlyade(browser);
  const ponsardEvents = await scrapePonsard(browser);
  const agoraEvents = await scrapeAgora(browser);
  const diapasonEvents = await scrapeDiapason(browser);
  const theatreEnRondEvents = await scrapeTheatreEnRond();
  const heureBleueEvents = await scrapeHeureBleue();
  const faiencerieEvents = await scrapeFaiencerie();
  const manegeEvents = await scrapeManege();
  const grenobleEvents = await scrapeGrenoble();
  const summumEvents = await scrapeSummum();
  const hexagoneEvents = await scrapeHexagone(browser);

  await browser.close();

  const allEvents = [
    ...grandAngleEvents, ...mc2Events, ...velleinEvents, ...hexagoneEvents,
    ...rampeEvents, ...ilyadeEvents, ...ponsardEvents, ...agoraEvents,
    ...diapasonEvents, ...theatreEnRondEvents, ...heureBleueEvents,
    ...faiencerieEvents, ...manegeEvents, ...grenobleEvents, ...summumEvents
  ].map(e => ({ ...e, image: e.image || PLACEHOLDER, dateISO: toDateISO(e.date) }));

  fs.writeFileSync("all-events.json", JSON.stringify(allEvents, null, 2), "utf-8");
  console.log(`Total événements combinés : ${allEvents.length}`);
}
