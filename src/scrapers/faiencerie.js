import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const PDF_URL = "https://www.latronche.fr/cms_viewFile.php?idtf=1006&path=Prog-faiencerie-page-a-page.pdf";
const PAGE_URL = "https://www.latronche.fr/100-la-faiencerie-salle-de-spectacle.htm";

export async function scrapeFaiencerie() {
  const res = await axios.get(PDF_URL, {
    responseType: "arraybuffer",
    headers: { "User-Agent": "Mozilla/5.0 (GrandAngleScraper/1.0)" }
  });

  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(res.data) }).promise;
  const events = [];

  // Pages 3-14 : une par spectacle
  for (let i = 3; i <= 14; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items
      .filter(item => item.str.trim())
      .map(item => ({
        str: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        h: Math.round(item.height)
      }));

    const title = items.find(t => t.h === 25)?.str || "";
    const genre = items.find(t => t.h === 20)?.str || "";
    const dateItem = items.find(t =>
      t.h === 10 && t.x < 100 && /(?:jan|fév|mar|avr|mai|jun|jui|aoû|sep|oct|nov|déc)/i.test(t.str)
    );
    const date = dateItem?.str.replace(" I ", " ") || "";

    if (title) events.push({ date, title, genre, link: PAGE_URL, image: "", lieu: "La Faïencerie" });
  }

  // Page 15 : spectacles supplémentaires
  const page15 = await doc.getPage(15);
  const content15 = await page15.getTextContent();
  const items15 = content15.items
    .filter(item => item.str.trim())
    .map(item => ({
      str: item.str.trim(),
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
      h: Math.round(item.height)
    }))
    .filter(t => t.x < 180)
    .sort((a, b) => b.y - a.y);

  const knownTitles = new Set(events.map(e => e.title.toUpperCase()));
  let currentTitle = "", currentDate = "", currentGenre = "";

  for (const item of items15) {
    if (item.str === "&") continue;
    const isTitle = /^[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ\s!''•-]+$/.test(item.str) && item.str.length > 3 && item.h >= 9;
    const isDate = /(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(item.str);

    if (isTitle && !knownTitles.has(item.str.toUpperCase())) {
      if (currentTitle && !knownTitles.has(currentTitle.toUpperCase())) {
        events.push({ date: currentDate, title: currentTitle, genre: currentGenre, link: PAGE_URL, image: "", lieu: "La Faïencerie" });
        knownTitles.add(currentTitle.toUpperCase());
      }
      currentTitle = item.str;
      currentDate = "";
      currentGenre = "";
    } else if (isDate && currentTitle) {
      currentDate = item.str;
    } else if (currentTitle && !isDate && item.h <= 11) {
      currentGenre = currentGenre || item.str;
    }
  }
  if (currentTitle && !knownTitles.has(currentTitle.toUpperCase())) {
    events.push({ date: currentDate, title: currentTitle, genre: currentGenre, link: PAGE_URL, image: "", lieu: "La Faïencerie" });
  }

  console.log(`La Faïencerie : ${events.length} événements récupérés`);
  return events;
}
