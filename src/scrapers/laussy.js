// ─── LE LAUSSY (Gières) ──────────────────────────────────────────────────────
// Technique : axios + cheerio (page statique)
// La page liste les spectacles sous la forme :
//   <strong>Vendredi 17 octobre à 20h30 : <a href="...">Titre</a></strong>
//   <ul><li>Genre</li><li>Artiste</li>...</ul>
//
// On extrait la date depuis le texte avant ":" dans le <strong>,
// le genre depuis le premier <li> du <ul> suivant,
// et l'image depuis la balise og:image de chaque page de détail.
//
// ⚠ Si l'URL change : modifier PAGE_URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";
import { fetchOgImage } from "../utils.js";

const BASE_URL = "https://www.ville-gieres.fr";
const PAGE_URL = `${BASE_URL}/vie-locale/saison-culturelle`;

export async function scrapeLaussy() {
  const { data } = await axios.get(PAGE_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const events = [];

  // Chaque spectacle est annoncé dans un <strong> contenant un <a>
  $("strong").each((i, el) => {
    const strong = $(el);
    const link = strong.find("a").first();
    if (!link.length) return; // ignorer les <strong> sans lien

    const title = link.text().trim();
    if (!title) return;

    const href = link.attr("href") || "";
    const fullLink = href.startsWith("http") ? href : BASE_URL + href;

    // Le texte du <strong> : "Vendredi 17 octobre à 20h30 : Titre"
    // On prend tout ce qui est avant le ":" pour avoir la date
    const rawText = strong.text();
    const colonIdx = rawText.indexOf(":");
    const date = colonIdx > -1 ? rawText.slice(0, colonIdx).trim() : "";

    // Le genre est dans le premier <li> du <ul> qui suit immédiatement
    const parent = strong.parent();
    const nextUl = parent.next("ul").length ? parent.next("ul") : parent.nextAll("ul").first();
    const genre = nextUl.find("li").first().text().trim();

    // Ignore les entrées sans date valide (ex: "Plaquette saison 2025-2026")
    if (!date || !/\d/.test(date)) return;

    events.push({ title, date, genre, link: fullLink, image: "", lieu: "Le Laussy" });
  });

  // Les images ne sont pas dans le listing → on les récupère sur chaque page de détail
  // On traite par groupes de 5 pour ne pas surcharger le serveur
  const chunks = [];
  for (let i = 0; i < events.length; i += 5) chunks.push(events.slice(i, i + 5));
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (e) => {
      if (e.link && e.link !== PAGE_URL) e.image = await fetchOgImage(e.link);
    }));
  }

  return events;
}
