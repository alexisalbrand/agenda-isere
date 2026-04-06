// ─── DIAPASON (Saint-Marcellin) ──────────────────────────────────────────────
// Technique : Puppeteer + cheerio
// Le site charge le contenu en JavaScript.
// L'image n'est pas dans une balise <img> mais dans le style CSS inline
// d'un élément <figure> (background-image: url('...')).
// Pas de genre disponible sur le listing.
//
// ⚠ Si l'URL change : modifier URL
// ─────────────────────────────────────────────────────────────────────────────

import * as cheerio from "cheerio";

const URL = "https://www.diapason-saint-marcellin.fr";

export async function scrapeDiapason(browser) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  const html = await page.content();
  await page.close();

  const $ = cheerio.load(html);
  const events = [];

  $(".spectacles-item").each((_, el) => {
    const title = $(el).find(".spectacles-titre").text().trim();
    const link  = $(el).find(".spectacles-button").parent("a").attr("href");

    // L'image est dans le style CSS : style="background-image: url('...')"
    const style = $(el).find("figure.spectacles-image").attr("style") || "";
    const image = style.match(/url\('([^']+)'\)/)?.[1]; // extraction par regex

    // Plusieurs dates possibles, on les rassemble
    const dateTexts = $(el).find(".spectacles-date-interne em").map((_, e) => $(e).text().trim()).get();
    const date = dateTexts.join(" ");

    if (title) events.push({ date, title, genre: "", link, image, lieu: "Diapason Saint-Marcellin" });
  });

  console.log(`Diapason Saint-Marcellin : ${events.length} événements récupérés`);
  return events;
}
