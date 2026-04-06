// ─── L'ILYADE (Échirolles) ───────────────────────────────────────────────────
// Technique : Puppeteer + cheerio
// Le site utilise Elementor (WordPress) avec un bouton "Voir plus" qui charge
// les spectacles suivants via AJAX. On clique dessus en boucle jusqu'à
// ce qu'il disparaisse.
// Les images ne sont pas dans le listing → on les récupère sur chaque page
// de spectacle via la balise og:image (méta-données Open Graph).
//
// ⚠ Si l'URL change : modifier URL
// ─────────────────────────────────────────────────────────────────────────────

import * as cheerio from "cheerio";
import { fetchOgImage } from "../utils.js";

const URL = "https://www.lilyade.fr/programmation/";

export async function scrapeIlyade(browser) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });

  // Clique sur "Voir plus" jusqu'à ce que le bouton disparaisse
  let clicks = 0;
  while (true) {
    const btn = await page.$(".e-loop__load-more a.elementor-button");
    if (!btn) break;
    const visible = await btn.isVisible();
    if (!visible) break;
    await btn.click();
    await new Promise(r => setTimeout(r, 2500)); // attendre le chargement AJAX
    if (++clicks > 30) break; // sécurité anti-boucle infinie
  }

  const html = await page.content();
  await page.close();

  const $ = cheerio.load(html);
  const raw = [];

  // Chaque spectacle est dans un élément avec une classe contenant "e-loop-item"
  $("[class*='e-loop-item']").each((_, el) => {
    // Le lien vers la page du spectacle contient "/evenements/" dans son URL
    const link  = $(el).find("a[href*='/evenements/']").first().attr("href");
    const title = $(el).find("a[href*='/evenements/']").filter((_, a) => $(a).text().trim()).last().text().trim();
    // Les infos (genre, date) sont dans des éléments .elementor-post-info__item
    const infoItems = $(el).find(".elementor-post-info__item").map((_, i) => $(i).text().trim()).get();
    if (title) raw.push({ link, title, genre: infoItems[0] || "", date: infoItems[1] || "" });
  });

  // Récupère l'image og:image sur chaque page de spectacle (en parallèle)
  const events = await Promise.all(raw.map(async r => ({
    ...r,
    image: r.link ? await fetchOgImage(r.link) : "",
    lieu: "L'ilyade"
  })));

  console.log(`L'ilyade : ${events.length} événements récupérés`);
  return events;
}
