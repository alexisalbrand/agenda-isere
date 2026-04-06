// ─── AGORA (Saint-Ismier) ────────────────────────────────────────────────────
// Technique : Puppeteer + cheerio
// Le site charge le contenu en JavaScript.
// Certains spectacles apparaissent plusieurs fois (plusieurs dates) :
// on déduplique par titre avec un Set.
//
// ⚠ Si l'URL change : modifier URL (attention, l'URL contient un identifiant
//   numérique qui peut changer d'une saison à l'autre)
// ─────────────────────────────────────────────────────────────────────────────

import * as cheerio from "cheerio";

const URL  = "https://www.agora-saint-ismier.com/fr/ev/2607503/agenda-1730";
const BASE = "https://www.agora-saint-ismier.com";

export async function scrapeAgora(browser) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  const html = await page.content();
  await page.close();

  const $ = cheerio.load(html);
  const seen = new Set(); // pour éviter les doublons
  const events = [];

  // Chaque spectacle est un lien <a class="card-date">
  $("a.card-date").each((_, el) => {
    const title = $(el).find(".card-title").text().trim();
    if (!title || seen.has(title)) return; // ignorer les doublons
    seen.add(title);

    const link  = BASE + ($(el).attr("href") || "");
    const image = $(el).find("img").attr("src");
    const date  = $(el).find(".card-time").text().trim();
    const genre = $(el).find(".card-text.address").text().trim();

    events.push({ date, title, genre, link, image, lieu: "Agora Saint-Ismier" });
  });

  console.log(`Agora Saint-Ismier : ${events.length} événements récupérés`);
  return events;
}
