// ─── PALAIS DES SPORTS DE GRENOBLE ───────────────────────────────────────────
// Technique : axios + cheerio (HTML statique, grenoble.fr)
// Structure : grille .c-card sur /183-programmation-du-palais-des-sports.htm
//   - .c-card__title a.c-card__link → titre + lien (relatif → absolu)
//   - li.o-date → "Vendredi 29.05 29 mai" ou "… à 20h00"
//   - .o-tag--primary → genre
//   - .c-card__image → image (relative → absolue)
//
// ⚠ Si l'URL change : modifier PAGE_URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.grenoble.fr";
const PAGE_URL = `${BASE_URL}/183-programmation-du-palais-des-sports.htm`;

export async function scrapePalaisSports() {
  const { data } = await axios.get(PAGE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36" },
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const events = [];

  $(".c-card").each((_, card) => {
    const $card = $(card);
    const title = $card.find(".c-card__title a").text().trim();
    if (!title) return;

    const href  = $card.find(".c-card__link").attr("href") || "";
    const link  = href.startsWith("http") ? href : `${BASE_URL}${href}`;

    // Date : texte lisible de l'humain (u-visuallyhidden) + heure éventuelle
    const rawDate = $card.find("li.o-date").first().text().trim().replace(/\s+/g, " ");
    // Extrait "29 mai à 20h00" en supprimant le jour de semaine et le format 29.05
    const date = rawDate.replace(/\w+\s+\d+\.\d+\s+/i, "").trim();

    const genre = $card.find(".o-tag--primary").first().text().trim();

    const imgSrc = $card.find(".c-card__image").attr("src") || "";
    const image  = imgSrc.startsWith("http") ? imgSrc : (imgSrc ? `${BASE_URL}${imgSrc}` : "");

    events.push({ title, date, genre, link, image, lieu: "Palais des Sports de Grenoble" });
  });

  return events;
}
