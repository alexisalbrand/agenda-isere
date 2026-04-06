// ─── THÉÂTRE FRANÇOIS PONSARD (Vienne) ──────────────────────────────────────
// Technique : Puppeteer + cheerio
// Le site charge le contenu en JavaScript, d'où l'usage de Puppeteer.
// Les spectacles sont dans une grille (.grille-saison-cellule).
// Le genre est encodé dans les classes CSS de chaque cellule.
//
// ⚠ Si l'URL change : modifier URL
// ─────────────────────────────────────────────────────────────────────────────

import * as cheerio from "cheerio";

const URL = "https://www.theatre-francois-ponsard.fr/saison/tous-publics";

export async function scrapePonsard(browser) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  const html = await page.content();
  await page.close();

  const $ = cheerio.load(html);
  const events = [];
  // Classes à ignorer pour extraire le genre depuis les classes CSS
  const ignoredClasses = new Set(["grille-saison-cellule", "spectacle-passe", "spectacle-avenir"]);

  $(".grille-saison-cellule").each((_, el) => {
    const title = $(el).find("h5").text().trim();
    const link  = $(el).find("a").first().attr("href");
    const image = $(el).find("img").attr("src");
    const date  = $(el).find(".grille-saison-date").text().replace(/\s+/g, " ").trim();
    // Les classes CSS de la cellule encodent le genre (ex: "theatre", "musique"...)
    const genre = ($(el).attr("class") || "").split(" ")
      .filter(c => !ignoredClasses.has(c) && !/^\d+$/.test(c))
      .join(", ");

    if (title) events.push({ date, title, genre, link, image, lieu: "Théâtre François Ponsard" });
  });

  console.log(`Ponsard : ${events.length} événements récupérés`);
  return events;
}
