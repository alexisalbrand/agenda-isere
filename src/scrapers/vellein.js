// ─── LE VELLEIN (Villefontaine) ──────────────────────────────────────────────
// Technique : Puppeteer + cheerio
// Puppeteer nécessaire : le site charge le contenu en JavaScript.
// Tout est sur une seule page, pas de pagination.
//
// ⚠ Si l'URL change : modifier URL
// ─────────────────────────────────────────────────────────────────────────────

import * as cheerio from "cheerio";

const URL = "https://levellein.capi-agglo.fr/spectacles/";

export async function scrapeVellein(browser) {
  const page = await browser.newPage();
  // User-Agent complet pour éviter d'être bloqué comme un bot
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  const html = await page.content();
  await page.close();

  const $ = cheerio.load(html);
  const events = [];

  // Chaque spectacle est dans un <article class="col-md-4">
  $("article.col-md-4").each((_, el) => {
    const title = $(el).find("h3").text().trim();
    const genre = $(el).find(".card-cat span i").text().trim();
    const link  = $(el).find("a").attr("href");
    const image = $(el).find("img.card-img-top").attr("src");

    // La date est composée de plusieurs <span> (ex: "Vendredi" + "14 mars")
    const spans = $(el).find(".m-season__card-time time span").map((_, s) => $(s).text().trim()).get();
    const date = spans.filter(Boolean).join(" ");

    if (title) events.push({ date, title, genre, link, image, lieu: "Le Vellein" });
  });

  console.log(`Le Vellein : ${events.length} événements récupérés`);
  return events;
}
