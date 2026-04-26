// ─── MC2 GRENOBLE ────────────────────────────────────────────────────────────
// Technique : axios + cheerio (le HTML est rendu côté serveur)
// Structure : article.affiche-item par spectacle
//   - .affiche-title h3 → titre
//   - .affiche-category → genre
//   - time[datetime] → date ISO directe (attribut datetime="YYYY-MM-DD")
//   - img → image
//   - a[href] → lien
//
// ⚠ Si l'URL change : modifier PAGE_URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

const PAGE_URL = "https://www.mc2grenoble.fr/agenda/liste/";
const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36" };

export async function scrapemc2AllPages() {
  const { data } = await axios.get(PAGE_URL, { headers: HEADERS, timeout: 15000 });
  const $ = cheerio.load(data);
  const events = [];

  $("article.affiche-item").each((_, el) => {
    const title = $(el).find(".affiche-title h3").text().trim();
    if (!title) return;

    const genre = $(el).find(".affiche-category").text().trim();
    const link  = $(el).find("a").attr("href") || PAGE_URL;
    const image = $(el).find("img").attr("src") || "";

    // Plage de dates possible (ex: "28 avr – 3 mai") → on prend la première
    const datetime = $(el).find("time[datetime]").first().attr("datetime") || "";

    events.push({ title, genre, link, image, date: datetime, lieu: "MC2 Grenoble" });
  });

  return events;
}
