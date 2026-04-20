// ─── ATRIUM DE FONTANIL-CORNILLON ────────────────────────────────────────────
// Technique : axios + cheerio (WordPress)
// Chaque spectacle est un élément .cat-post-item contenant :
//   - <a class="cat-post-everything-is-link"> → lien
//   - <span class="cat-post-title"> → titre
//   - <img> → image
//   - Premier <p> → date (ex: "Vendredi 24 avril 2026 - 20 h 30")
//   - Second <p> → genre (ex: "Jazz Swing / À la Santé de Django")
//
// ⚠ Si l'URL change : modifier PAGE_URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";
import { fetchOgImage } from "../utils.js";

const PAGE_URL = "https://ville-fontanil.fr/culturesport/atrium/";

export async function scrapeAtrium() {
  const { data } = await axios.get(PAGE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const events = [];

  $(".cat-post-item").each((_, el) => {
    const item = $(el);

    const a = item.find("a.cat-post-everything-is-link").first();
    const link = a.attr("href") || "";
    const title = item.find(".cat-post-title").text().trim();
    if (!title) return;

    const imgSrc = item.find("img").first().attr("src") || "";
    // Prend la version haute résolution si disponible dans srcset
    const srcset = item.find("img").first().attr("srcset") || "";
    const highRes = srcset.split(",").map(s => s.trim().split(" ")[0]).filter(Boolean).pop();
    const image = highRes || imgSrc;

    const paragraphs = item.find("p").map((_, p) => $(p).text().trim()).get().filter(Boolean);
    const date  = paragraphs[0] || "";
    const genre = paragraphs[1] || "";

    // Ignore les placeholders SVG (images pas encore chargées via lazy loading)
    const validImage = image.startsWith("data:") ? "" : image;
    events.push({ title, date, genre, link, image: validImage, lieu: "Atrium de Fontanil" });
  });

  // Récupère l'og:image pour les événements sans image
  const chunks = [];
  for (let i = 0; i < events.length; i += 5) chunks.push(events.slice(i, i + 5));
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (e) => {
      if (!e.image && e.link) e.image = await fetchOgImage(e.link);
    }));
  }

  return events;
}
