// ─── MANÈGE DE VIENNE ────────────────────────────────────────────────────────
// Technique : axios + cheerio (WordPress, page statique)
// Les spectacles sont des articles WordPress sur le blog du Manège.
// Le genre est extrait des classes CSS de l'article (ex: "category-theatre").
// La date est dans le premier <h3> du contenu de l'article.
//
// ⚠ Si l'URL change : modifier URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

const URL = "https://manege.vienne.fr/blog/";

export async function scrapeManege() {
  const { data } = await axios.get(URL, {
    headers: { "User-Agent": "Mozilla/5.0 (GrandAngleScraper/1.0)" }
  });

  const $ = cheerio.load(data);
  const events = [];

  $("article").each((_, el) => {
    const title = $(el).find(".entry-title a").text().trim();
    const link  = $(el).find(".entry-title a").attr("href");
    const image = $(el).find(".entry-content img").first().attr("src");
    // La date est dans le premier titre h3 du contenu
    const date  = $(el).find(".entry-content h3").first().text().trim();
    // Le genre vient des classes CSS : "category-theatre" → "theatre"
    const genre = ($(el).attr("class") || "")
      .match(/category-[\w-]+/g)?.map(c => c.replace("category-", "")).join(", ") || "";

    if (title) events.push({ date, title, genre, link, image, lieu: "Manège de Vienne" });
  });

  console.log(`Manège de Vienne : ${events.length} événements récupérés`);
  return events;
}
