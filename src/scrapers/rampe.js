// ─── LA RAMPE (Échirolles) ───────────────────────────────────────────────────
// Technique : axios + cheerio (page statique)
// Tout est sur une seule page, pas de pagination.
//
// ⚠ Si l'URL change : modifier URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

const URL = "https://www.larampe-echirolles.fr/tous-les-spectacles/";

export async function scrapeRampe() {
  const { data } = await axios.get(URL, {
    headers: { "User-Agent": "Mozilla/5.0 (GrandAngleScraper/1.0)" }
  });

  const $ = cheerio.load(data);
  const events = [];

  // Chaque spectacle est dans un div.item
  $("div.item").each((_, el) => {
    const title = $(el).find(".pos-content a h2").text().trim();
    const link  = $(el).find(".pos-content a").attr("href");
    const image = $(el).find(".pos-media img").attr("src");
    const date  = $(el).find("li.date_first").text().trim();
    // Plusieurs catégories possibles, on les joint avec une virgule
    const genre = $(el).find("li.categories a").map((_, a) => $(a).text().trim()).get().join(", ");

    if (title) events.push({ date, title, genre, link, image, lieu: "La Rampe" });
  });

  console.log(`La Rampe : ${events.length} événements récupérés`);
  return events;
}
