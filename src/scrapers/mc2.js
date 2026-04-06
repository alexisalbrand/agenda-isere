// ─── MC2 GRENOBLE ────────────────────────────────────────────────────────────
// Technique : Puppeteer + cheerio
// Puppeteer est nécessaire car le site charge les spectacles en JavaScript.
// Même logique que Grand Angle : pagination /page/1/, /page/2/...
//
// ⚠ Si l'URL change : modifier BASE_URL
// ─────────────────────────────────────────────────────────────────────────────

import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

const BASE_URL = "https://www.mc2grenoble.fr/agenda/liste/page/";

// Ouvre une page dans le navigateur et extrait les événements
async function scrapePage(browser, url) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  const html = await page.content();
  await page.close();

  const $ = cheerio.load(html);
  const events = [];

  // Chaque spectacle est dans un <article class="affiche-item">
  $("article.affiche-item").each((_, el) => {
    const title = $(el).find(".affiche-title h3").text().trim();
    const genre = $(el).find(".affiche-category").text().trim();
    const link  = $(el).find("a").attr("href");
    const image = $(el).find("img").attr("src");

    // La MC2 affiche parfois une plage de dates (ex: "oct 12 - nov 3")
    const months = [];
    const days = [];
    $(el).find(".tribe-events-pro-photo__event-date-tag-datetime").each((_, time) => {
      const month = $(time).find(".tribe-events-pro-photo__event-date-tag-month").text().trim();
      const day   = $(time).find(".tribe-events-pro-photo__event-date-tag-daynum").text().trim();
      if (month && day) { months.push(month); days.push(day); }
    });
    const date = months.length === 2
      ? `${months[0]} ${days[0]} - ${months[1]} ${days[1]}`
      : months.length === 1 ? `${months[0]} ${days[0]}` : "";

    if (title) events.push({ date, title, genre, link, image, lieu: "MC2 Grenoble" });
  });

  return events;
}

// Lance son propre navigateur et parcourt toutes les pages
export async function scrapemc2AllPages() {
  const browser = await puppeteer.launch({ headless: true });
  let pageNum = 1;
  let allEvents = [];

  while (true) {
    const url = `${BASE_URL}${pageNum}/`;
    console.log(`Scraping MC2 page ${pageNum}...`);

    const events = await scrapePage(browser, url);
    if (events.length === 0) break;

    allEvents = allEvents.concat(events);
    pageNum++;
    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();
  console.log(`MC2 Grenoble : ${allEvents.length} événements récupérés`);
  return allEvents;
}
