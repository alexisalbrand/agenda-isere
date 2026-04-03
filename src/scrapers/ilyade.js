import * as cheerio from "cheerio";
import { fetchOgImage } from "../utils.js";

const URL = "https://www.lilyade.fr/programmation/";

export async function scrapeIlyade(browser) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });

  let clicks = 0;
  while (true) {
    const btn = await page.$(".e-loop__load-more a.elementor-button");
    if (!btn) break;
    const visible = await btn.isVisible();
    if (!visible) break;
    await btn.click();
    await new Promise(r => setTimeout(r, 2500));
    if (++clicks > 30) break;
  }

  const html = await page.content();
  await page.close();

  const $ = cheerio.load(html);
  const raw = [];
  $("[class*='e-loop-item']").each((_, el) => {
    const link = $(el).find("a[href*='/evenements/']").first().attr("href");
    const title = $(el).find("a[href*='/evenements/']").filter((_, a) => $(a).text().trim()).last().text().trim();
    const infoItems = $(el).find(".elementor-post-info__item").map((_, i) => $(i).text().trim()).get();
    if (title) raw.push({ link, title, genre: infoItems[0] || "", date: infoItems[1] || "" });
  });

  const events = await Promise.all(raw.map(async r => ({
    ...r,
    image: r.link ? await fetchOgImage(r.link) : "",
    lieu: "L'ilyade"
  })));

  console.log(`L'ilyade : ${events.length} événements récupérés`);
  return events;
}
