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
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  const [b1, b2] = await Promise.all([
    puppeteer.launch(launchOpts),
    puppeteer.launch(launchOpts),
  ]);

  const [
    grandAngleEvents, mc2Events, velleinEvents, rampeEvents,
    ilyadeEvents, ponsardEvents, agoraEvents, diapasonEvents,
    theatreEnRondEvents, heureBleueEvents, faiencerieEvents,
    manegeEvents, grenobleEvents, summumEvents
  ] = await Promise.all([
    scrapeGrandAngleAllPages(),
    scrapemc2AllPages(),
    scrapeVellein(b1),
    scrapeRampe(),
    scrapeIlyade(b2),
    scrapePonsard(b2),
    scrapeAgora(b1),
    scrapeDiapason(b1),
    scrapeTheatreEnRond(),
    scrapeHeureBleue(),
    scrapeFaiencerie(),
    scrapeManege(),
    scrapeGrenoble(),
    scrapeSummum(),
  ]);

  await Promise.all([b1.close(), b2.close()]);

  // Hexagone nécessite son propre navigateur (scroll infini lourd)
  const b3 = await puppeteer.launch(launchOpts);
  const hexagoneEvents = await scrapeHexagone(b3);
  await b3.close();

  const allEvents = [
    ...grandAngleEvents, ...mc2Events, ...velleinEvents, ...hexagoneEvents,
    ...rampeEvents, ...ilyadeEvents, ...ponsardEvents, ...agoraEvents,
    ...diapasonEvents, ...theatreEnRondEvents, ...heureBleueEvents,
    ...faiencerieEvents, ...manegeEvents, ...grenobleEvents, ...summumEvents
  ].map(e => ({ ...e, image: e.image || PLACEHOLDER, dateISO: toDateISO(e.date) }));

  fs.writeFileSync("all-events.json", JSON.stringify(allEvents, null, 2), "utf-8");
  console.log(`Total événements combinés : ${allEvents.length}`);
}
