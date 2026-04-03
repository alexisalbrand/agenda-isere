import axios from "axios";
import * as cheerio from "cheerio";

const URL = "https://culture.saintmartindheres.fr/sortir/programmation-heure-bleue/";

export async function scrapeHeureBleue() {
  const { data } = await axios.get(URL, {
    headers: { "User-Agent": "Mozilla/5.0 (GrandAngleScraper/1.0)" }
  });

  const $ = cheerio.load(data);
  const events = [];

  $("article").each((_, el) => {
    const rawTitle = $(el).find(".entry-title a").text().trim();
    const link = $(el).find(".entry-title a").attr("href");
    const image = $(el).find(".post-thumbnail img").attr("src");
    const date = $(el).find(".event_date").attr("data-start") || "";

    const genreMatch = rawTitle.match(/^\[([^\]]+)\]/);
    const genre = genreMatch ? genreMatch[1] : "";
    const title = rawTitle.replace(/^\[[^\]]+\]\s*/, "").replace(/\s*>.*$/, "").trim();

    if (title) events.push({ date, title, genre, link, image, lieu: "L'Heure Bleue" });
  });

  console.log(`L'Heure Bleue : ${events.length} événements récupérés`);
  return events;
}
