// ─── LA VENCE SCÈNE (Saint-Égrève) ──────────────────────────────────────────
// Technique : axios + cheerio (page statique)
// Structure réelle : chaque spectacle est un <a class="composite-link"> contenant
// une image <picture>, un titre <h2 class="subpages-menu__title"> et un <p class="subpages-menu__teaser">
// avec la compagnie et la date séparées par <br>.
//
// ⚠ Le site bloque les navigateurs headless (Puppeteer → 403) mais accepte axios
//   avec un User-Agent Chrome complet.
// ⚠ Si l'URL change : modifier PAGE_URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://lavencescene.saint-egreve.fr";
const PAGE_URL = `${BASE_URL}/spectacles-645.html`;

export async function scrapeVenceScene() {
  const { data } = await axios.get(PAGE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const events = [];

  // Sélectionne les liens <a class="composite-link"> pointant vers un spectacle
  $("a.composite-link[href*='spectacle']").each((_, el) => {
    const a = $(el);
    const href = a.attr("href") || "";

    // Les titres sont en <h2>, pas <h3>
    const title = a.find("h2").text().trim();
    if (!title) return;

    const imgSrc = a.find("img").attr("src") || "";
    const image = imgSrc ? (imgSrc.startsWith("http") ? imgSrc : BASE_URL + imgSrc) : "";
    const link  = href.startsWith("http") ? href : BASE_URL + href;

    // Le <p class="subpages-menu__teaser"> contient "Compagnie<br>Genre<br>Date" ou "Genre<br>Date"
    const p = a.find("p.subpages-menu__teaser");
    p.find("br").replaceWith("\n");
    const lines = p.text().split("\n").map(l => l.trim()).filter(Boolean);
    // La dernière ligne peut être "SPECTACLE COMPLET" — on cherche la ligne avec une date
    const dateIdx = lines.map(l => l.toLowerCase()).findLastIndex(l => /\d{1,2}.*\d{4}/.test(l));
    const date  = dateIdx >= 0 ? lines[dateIdx] : "";
    const genre = dateIdx >= 1 ? lines[dateIdx - 1] : lines[lines.length - 1] || "";

    events.push({ title, date, genre, link, image, lieu: "La Vence Scène" });
  });

  return events;
}
