// ─── THÉÂTRE SAINT-MARTIN (Vals-près-le-Puy) ─────────────────────────────────
// Technique : axios + cheerio (WordPress, HTML statique)
// Listing : /programmation/ → liens /programmation/xxx/
// Chaque page de spectacle contient :
//   - <h1> → titre
//   - og:image → image
//   - Premier texte contenant "JJ mois" → date de début de résidence
//
// ⚠ Si l'URL change : modifier BASE_URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.theatresaintmartin.com";
const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36" };
const MONTH_RE = /\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i;

async function get(url) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
  return cheerio.load(data);
}

export async function scrapeTheatreSaintMartin() {
  const $list = await get(`${BASE_URL}/programmation/`);

  // Collecte des URLs de spectacles (dédoublonnées, hors abonnement)
  const showUrls = [...new Set(
    $list("a[href]").map((_, el) => $list(el).attr("href")).get()
      .filter(h => h.startsWith("/programmation/") && h !== "/programmation/" && !h.includes("abonnement"))
  )];

  const results = [];
  // Fetch sequentiellement pour ne pas surcharger le serveur
  for (const path of showUrls) {
    try {
      const $ = await get(`${BASE_URL}${path}`);
      // Titre : <title> (le h1 est vide — rendu côté client)
      const title = $("title").text().trim();
      if (!title) continue;

      const image = $('meta[property="og:image"]').attr("content") || "";

      // Cherche le premier texte "JJ mois" sur la page
      let date = "";
      $("*").each((_, el) => {
        if (date) return false;
        const t = $(el).clone().children().remove().end().text().trim();
        if (MONTH_RE.test(t) && t.length < 120) date = t;
      });

      results.push({ title, date, genre: "", link: `${BASE_URL}${path}`, image, lieu: "Théâtre Saint-Martin" });
    } catch { /* page inaccessible → on ignore */ }
  }
  return results;
}
