// ─── L'HEURE BLEUE (Saint-Martin-d'Hères) ───────────────────────────────────
// Technique : axios + cheerio (WordPress, page statique)
// Les titres incluent le genre entre crochets : "[Théâtre] Mon spectacle"
// On extrait et nettoie le titre et le genre séparément.
// La date est dans un attribut data-start sur un élément .event_date.
//
// ⚠ Si l'URL change : modifier URL
// ─────────────────────────────────────────────────────────────────────────────

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
    const link     = $(el).find(".entry-title a").attr("href");
    const image    = $(el).find(".post-thumbnail img").attr("src");
    // La date est dans un attribut data-start (format ISO)
    const date     = $(el).find(".event_date").attr("data-start") || "";

    // Extrait le genre entre crochets au début du titre : "[Genre] Titre > sous-titre"
    const genreMatch = rawTitle.match(/^\[([^\]]+)\]/);
    const genre  = genreMatch ? genreMatch[1] : "";
    // Supprime le genre et le sous-titre éventuel après ">"
    const title  = rawTitle.replace(/^\[[^\]]+\]\s*/, "").replace(/\s*>.*$/, "").trim();

    if (title) events.push({ date, title, genre, link, image, lieu: "L'Heure Bleue" });
  });

  console.log(`L'Heure Bleue : ${events.length} événements récupérés`);
  return events;
}
