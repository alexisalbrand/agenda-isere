import * as cheerio from "cheerio";

const URL = "https://www.theatre-hexagone.eu/saison/";

export async function scrapeHexagone(browser) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });

  let prev = 0;
  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1500));
    const h = await page.evaluate(() => document.body.scrollHeight);
    if (h === prev) break;
    prev = h;
  }
  await new Promise(r => setTimeout(r, 2000));

  const html = await page.content();
  await page.close();

  const $ = cheerio.load(html);
  const events = [];

  $("[class*='eg-spectacles-performances-wrapper']").each((_, el) => {
    const title = $(el).find("a.eg-invisiblebutton").text().trim();
    const link = $(el).find("a.eg-invisiblebutton").attr("href");
    const image = $(el).find("img.esg-entry-media-img").attr("src");
    const date = $(el).find("[class*='element-11']").text().trim();
    const genre = $(el).find("[class*='element-14']").text().trim();

    if (title) events.push({ date, title, genre, link, image, lieu: "Hexagone" });
  });

  console.log(`Hexagone : ${events.length} événements récupérés`);
  return events;
}
