import axios from "axios";
import * as cheerio from "cheerio";

const URL = "https://www.theatre-en-rond.fr";
const UA = "Mozilla/5.0 (GrandAngleScraper/1.0)";

export async function scrapeTheatreEnRond() {
  const { data } = await axios.get(URL, { headers: { "User-Agent": UA } });

  const $ = cheerio.load(data);
  const raw = [];

  $("article").filter((_, el) => ($(el).attr("class") || "").includes("tag-spectacles")).each((_, el) => {
    const title = $(el).find(".entry-title a").text().trim();
    const link = $(el).find(".entry-title a").attr("href");
    const genre = $(el).find(".cat-links a")
      .map((_, a) => $(a).text().trim())
      .get()
      .filter(c => c !== "Saison Culturelle 2025-2026")
      .join(", ");
    const summary = $(el).find(".entry-summary p").text().trim();
    const dateMatch = summary.match(/(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)[^|]+\|\s*[\dh]+/i);
    const date = dateMatch ? dateMatch[0].trim() : "";
    if (title) raw.push({ date, title, genre, link });
  });

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
