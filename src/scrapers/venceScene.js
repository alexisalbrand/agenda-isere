// ─── LA VENCE SCÈNE (Saint-Égrève) ──────────────────────────────────────────
// Technique : axios + cheerio (page statique)
// Chaque spectacle est un lien <a> englobant une image, un titre <h3>
// et un paragraphe avec le genre et la date séparés par <br>.
//
// ⚠ Le site bloque les User-Agent trop simples (renvoie 403) :
//   on utilise un User-Agent complet de navigateur Chrome + headers Accept
// ⚠ Si l'URL change : modifier PAGE_URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://lavencescene.saint-egreve.fr";
const PAGE_URL = `${BASE_URL}/spectacles-645.html`;

export async function scrapeVenceScene() {
  const { data } = await axios.get(PAGE_URL, {
    headers: {
      // User-Agent complet obligatoire, sinon le serveur répond 403 Forbidden
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const events = [];

  // Sélectionne tous les liens <a> qui contiennent un <h3> (= cartes de spectacles)
  $("a:has(h3)").each((i, el) => {
    const a = $(el);
    const href = a.attr("href") || "";
    // Filtre : on ne garde que les liens vers des pages de spectacle
    if (!href.includes("spectacle")) return;

    const title = a.find("h3").text().trim();
    if (!title) return;

    const imgSrc = a.find("img").attr("src") || "";
    // Si l'URL de l'image est relative, on ajoute la base du site
    const image = imgSrc ? (imgSrc.startsWith("http") ? imgSrc : BASE_URL + imgSrc) : "";
    const link  = href.startsWith("http") ? href : BASE_URL + href;

    // Le <p> contient : "Genre<br>Date<br>Statut"
    // On remplace les <br> par des sauts de ligne pour pouvoir séparer les infos
    const p = a.find("p").first();
    p.find("br").replaceWith("\n");
    const lines = p.text().split("\n").map(l => l.trim()).filter(Boolean);
    const genre = lines[0] || ""; // première ligne = genre
    const date  = lines[1] || ""; // deuxième ligne = date

    events.push({ title, date, genre, link, image, lieu: "La Vence Scène" });
  });

  return events;
}
