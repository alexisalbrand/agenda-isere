// ─── GRAND ANGLE (Voiron) ────────────────────────────────────────────────────
// Technique : axios + cheerio (pas besoin de navigateur, la page est statique)
// Le site pagine les spectacles : /page/1/, /page/2/, etc.
// On boucle jusqu'à trouver une page vide.
//
// ⚠ Si l'URL change : modifier BASE_URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.le-grand-angle.fr/programmation/page/";

// Scrape une seule page et retourne les événements trouvés
async function scrapePage(url) {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 (GrandAngleScraper/1.0)" }
  });

  const $ = cheerio.load(data);
  const events = [];

  // Chaque spectacle est dans un div avec ces classes
  $("div.wpetOffer.wrapper_wpet_offer.resultsListItem").each((_, el) => {
    const date  = $(el).find(".wpetOfferThumbnailDate").text().trim();
    const title = $(el).find(".wpetOfferContainerContentTitle a").text().trim();
    const genre = $(el).find(".wpetOfferContainerContentCategory").text().trim();
    const link  = $(el).find(".wpetOfferContainerContentTitle a").attr("href");
    const image = $(el).find(".wpetOfferThumbnail img").attr("data-src"); // chargement lazy

    if (title) events.push({ date, title, genre, link, image, lieu: "Le Grand Angle" });
  });

  return events;
}

// Parcourt toutes les pages jusqu'à tomber sur une page vide
export async function scrapeGrandAngleAllPages() {
  let page = 1;
  let allEvents = [];

  while (true) {
    const url = `${BASE_URL}${page}/`;
    console.log(`Scraping Grand Angle page ${page}...`);

    const events = await scrapePage(url);
    if (events.length === 0) break; // plus de résultats → on s'arrête

    allEvents = allEvents.concat(events);
    page++;
    await new Promise(r => setTimeout(r, 1500)); // pause pour ne pas surcharger le serveur
  }

  console.log(`Grand Angle : ${allEvents.length} événements récupérés`);
  return allEvents;
}
