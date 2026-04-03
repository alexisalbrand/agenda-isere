import * as cheerio from "cheerio";

const URL = "https://levellein.capi-agglo.fr/spectacles/";

export async function scrapeVellein(browser) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  const html = await page.content();
  await page.close();

  const $ = cheerio.load(html);
  const events = [];

  $("article.col-md-4").each((_, el) => {
    const title = $(el).find("h3").text().trim();
    const genre = $(el).find(".card-cat span i").text().trim();
    const link = $(el).find("a").attr("href");
    const image = $(el).find("img.card-img-top").attr("src");

    const spans = $(el).find(".m-season__card-time time span").map((_, s) => $(s).text().trim()).get();
    const date = spans.filter(Boolean).join(" ");

    if (title) events.push({ date, title, genre, link, image, lieu: "Le Vellein" });
  });

  console.log(`Le Vellein : ${events.length} événements récupérés`);
  return events;
}
