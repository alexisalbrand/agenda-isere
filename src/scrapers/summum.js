import axios from "axios";
import * as cheerio from "cheerio";

const URL = "https://www.summum-grenoble.com/programmation/";

export async function scrapeSummum() {
  const { data } = await axios.get(URL, {
    headers: { "User-Agent": "Mozilla/5.0 (GrandAngleScraper/1.0)" }
  });

  const $ = cheerio.load(data);
  const events = [];

  $("a.event-push").each((_, el) => {
    const link = $(el).attr("href") || "";
    const title = $(el).find("h1.title-2").text().trim() || $(el).find("h2").text().trim();
    const date = $(el).find("time").text().trim();
    const genre = $(el).find("span.tag").text().trim();
    const image = $(el).find("picture img").attr("src") || $(el).find("img").first().attr("src") || "";

    if (title) events.push({ date, title, genre, link, image, lieu: "Summum" });
  });

  console.log(`Summum : ${events.length} événements récupérés`);
  return events;
}
