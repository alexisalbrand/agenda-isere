import axios from "axios";
import * as cheerio from "cheerio";

const URL = "https://www.grenoble.fr/45-spectacles.htm";
const BASE = "https://www.grenoble.fr";

export async function scrapeGrenoble() {
  const { data } = await axios.get(URL, {
    headers: { "User-Agent": "Mozilla/5.0 (GrandAngleScraper/1.0)" }
  });

  const $ = cheerio.load(data);
  const events = [];

  $(".c-card").each((_, el) => {
    const title = $(el).find(".c-card__link").text().trim();
    const link = BASE + ($(el).find("a").first().attr("href") || "");
    const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
    const fullImage = image ? (image.startsWith("http") ? image : BASE + image) : "";

    const dateEl = $(el).find(".c-card__dates");
    const day = dateEl.find(".u-visuallyhidden").first().text().trim();
    const time = dateEl.find(".o-date__time").first().text().replace(/[àa]/i, "").trim();
    const date = day ? `${day}${time ? " " + time : ""}` : "";

    const genre = $(el).find(".o-tag--primary").text().trim()
      || $(el).find(".o-tag").first().text().replace(/\d+/g, "").trim();

    if (title) events.push({ date, title, genre, link, image: fullImage, lieu: "TMG" });
  });

  console.log(`TMG : ${events.length} événements récupérés`);
  return events;
}
