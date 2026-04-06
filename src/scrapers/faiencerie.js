// ─── LA FAÏENCERIE (La Tronche) ──────────────────────────────────────────────
// Technique : PDF parsing (pdfjs-dist)
// Ce théâtre ne publie pas de page web structurée mais un PDF de sa
// programmation. On télécharge le PDF et on analyse son contenu texte
// en se basant sur la taille des caractères pour distinguer titre / genre / date.
//
// Structure du PDF :
//   - Pages 3 à 14 : une page par spectacle
//     → titre : texte de taille 25
//     → genre : texte de taille 20
//     → date  : texte de taille 10, en colonne gauche (x < 100), avec un mois
//   - Page 15 : spectacles supplémentaires en liste condensée
//
// ⚠ Si l'URL du PDF change : modifier PDF_URL
// ⚠ Si la structure du PDF change (nouvelles saisons) : les numéros de pages
//   et les tailles de police peuvent nécessiter un ajustement
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const PDF_URL  = "https://www.latronche.fr/cms_viewFile.php?idtf=1006&path=Prog-faiencerie-page-a-page.pdf";
const PAGE_URL = "https://www.latronche.fr/100-la-faiencerie-salle-de-spectacle.htm";

export async function scrapeFaiencerie() {
  // Télécharge le PDF en binaire
  const res = await axios.get(PDF_URL, {
    responseType: "arraybuffer",
    headers: { "User-Agent": "Mozilla/5.0 (GrandAngleScraper/1.0)" }
  });

  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(res.data) }).promise;
  const events = [];

  // Pages 3-14 : une page = un spectacle
  for (let i = 3; i <= 14; i++) {
    const page    = await doc.getPage(i);
    const content = await page.getTextContent();
    // Chaque "item" est un fragment de texte avec sa position (x, y) et sa taille (h)
    const items = content.items
      .filter(item => item.str.trim())
      .map(item => ({
        str: item.str.trim(),
        x: Math.round(item.transform[4]), // position horizontale
        y: Math.round(item.transform[5]), // position verticale
        h: Math.round(item.height)        // taille de la police
      }));

    const title = items.find(t => t.h === 25)?.str || "";           // le plus grand texte = titre
    const genre = items.find(t => t.h === 20)?.str || "";           // texte moyen = genre
    const dateItem = items.find(t =>
      t.h === 10 && t.x < 100 &&                                   // texte petit, colonne gauche
      /(?:jan|fév|mar|avr|mai|jun|jui|aoû|sep|oct|nov|déc)/i.test(t.str) // contient un mois
    );
    const date = dateItem?.str.replace(" I ", " ") || "";

    if (title) events.push({ date, title, genre, link: PAGE_URL, image: "", lieu: "La Faïencerie" });
  }

  // Page 15 : liste condensée de spectacles supplémentaires
  // Traitement différent car plusieurs spectacles sur la même page
  const page15   = await doc.getPage(15);
  const content15 = await page15.getTextContent();
  const items15 = content15.items
    .filter(item => item.str.trim())
    .map(item => ({
      str: item.str.trim(),
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
      h: Math.round(item.height)
    }))
    .filter(t => t.x < 180)       // on ne garde que la colonne gauche
    .sort((a, b) => b.y - a.y);   // trier de haut en bas

  const knownTitles = new Set(events.map(e => e.title.toUpperCase()));
  let currentTitle = "", currentDate = "", currentGenre = "";

  for (const item of items15) {
    if (item.str === "&") continue;
    // Titre : texte en majuscules, assez long, taille ≥ 9
    const isTitle = /^[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ\s!''•-]+$/.test(item.str) && item.str.length > 3 && item.h >= 9;
    // Date : contient un jour de la semaine
    const isDate  = /(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(item.str);

    if (isTitle && !knownTitles.has(item.str.toUpperCase())) {
      // Nouveau titre détecté → on sauvegarde le spectacle précédent
      if (currentTitle && !knownTitles.has(currentTitle.toUpperCase())) {
        events.push({ date: currentDate, title: currentTitle, genre: currentGenre, link: PAGE_URL, image: "", lieu: "La Faïencerie" });
        knownTitles.add(currentTitle.toUpperCase());
      }
      currentTitle = item.str;
      currentDate  = "";
      currentGenre = "";
    } else if (isDate && currentTitle) {
      currentDate = item.str;
    } else if (currentTitle && !isDate && item.h <= 11) {
      currentGenre = currentGenre || item.str; // premier texte non-date = genre
    }
  }
  // Sauvegarder le dernier spectacle
  if (currentTitle && !knownTitles.has(currentTitle.toUpperCase())) {
    events.push({ date: currentDate, title: currentTitle, genre: currentGenre, link: PAGE_URL, image: "", lieu: "La Faïencerie" });
  }

  console.log(`La Faïencerie : ${events.length} événements récupérés`);
  return events;
}
