// ─── THÉÂTRE EN ROND (Crolles) ───────────────────────────────────────────────
// Technique : axios + cheerio (WordPress, page statique)
// Les spectacles sont des articles WordPress filtrés par le tag "spectacles".
// Les images ne sont pas dans le listing → on visite chaque page de spectacle
// pour récupérer la première image du contenu.
// La date est extraite du résumé de l'article via une expression régulière.
//
// ⚠ Si l'URL change : modifier URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

const URL = "https://www.theatre-en-rond.fr";
const UA  = "Mozilla/5.0 (GrandAngleScraper/1.0)";

export async function scrapeTheatreEnRond() {
  const { data } = await axios.get(URL, { headers: { "User-Agent": UA } });

  const $ = cheerio.load(data);
  const raw = [];

  // Filtre les articles WordPress ayant le tag "spectacles"
  $("article").filter((_, el) => ($(el).attr("class") || "").includes("tag-spectacles")).each((_, el) => {
    const title = $(el).find(".entry-title a").text().trim();
    const link  = $(el).find(".entry-title a").attr("href");
    // Exclure la catégorie générique "Saison Culturelle 2025-2026"
    const genre = $(el).find(".cat-links a")
      .map((_, a) => $(a).text().trim())
      .get()
      .filter(c => c !== "Saison Culturelle 2025-2026")
      .join(", ");
    // La date est dans le résumé sous la forme "Vendredi 14 mars | 20h30"
    const summary   = $(el).find(".entry-summary p").text().trim();
    const dateMatch = summary.match(/(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)[^|]+\|\s*[\dh]+/i);
    const date      = dateMatch ? dateMatch[0].trim() : "";
    if (title) raw.push({ date, title, genre, link });
  });

  // Visite chaque page pour récupérer l'image principale
  const events = await Promise.all(raw.map(async r => {
    let image = "";
    if (r.link) {
      try {
        const { data: postData } = await axios.get(r.link, { headers: { "User-Agent": UA }, timeout: 10000 });
        const $p = cheerio.load(postData);
        image = $p(".entry-content img").first().attr("src") || "";
      } catch {}
    }
    return { ...r, image, lieu: "Théâtre en Rond" };
  }));

  console.log(`Théâtre en Rond : ${events.length} événements récupérés`);
  return events;
}
