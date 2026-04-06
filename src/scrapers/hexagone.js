// ─── HEXAGONE (Meylan) ───────────────────────────────────────────────────────
// Technique : Puppeteer + cheerio
// Le site utilise le plugin "Essential Grid" (WordPress) qui charge les
// spectacles progressivement au scroll via des requêtes AJAX.
// On scrolle en bas de page et on attend que de nouveaux items apparaissent,
// jusqu'à ce que le nombre reste stable.
//
// ⚠ Si l'URL change : modifier URL
// ─────────────────────────────────────────────────────────────────────────────

import * as cheerio from "cheerio";

const URL = "https://www.theatre-hexagone.eu/saison/";

export async function scrapeHexagone(browser) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });

  // Scroll infini : on descend en bas, on attend les nouvelles requêtes AJAX,
  // on recommence jusqu'à ce qu'aucun nouvel item n'apparaisse
  for (let i = 0; i < 30; i++) {
    const prevCount = await page.evaluate(() =>
      document.querySelectorAll("a.eg-invisiblebutton").length
    );
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    try {
      // Attendre que le réseau soit calme (les items AJAX sont chargés)
      await page.waitForNetworkIdle({ idleTime: 1000, timeout: 8000 });
    } catch {}
    const newCount = await page.evaluate(() =>
      document.querySelectorAll("a.eg-invisiblebutton").length
    );
    if (newCount === prevCount) break; // plus rien de nouveau → on s'arrête
  }

  const html = await page.content();
  await page.close();

  const $ = cheerio.load(html);
  const events = [];

  // Tous les items ont un lien avec la classe "eg-invisiblebutton"
  // Le wrapper parent (classe variable selon le type) contient l'image, la date, le genre
  $("a.eg-invisiblebutton").each((_, el) => {
    const a       = $(el);
    const wrapper = a.closest("[class*='-wrapper']"); // remonte au conteneur parent
    const title   = a.text().trim();
    const link    = a.attr("href");
    const image   = wrapper.find("img.esg-entry-media-img").attr("src");
    const date    = wrapper.find("[class*='element-11']").text().trim(); // élément date dans la grille
    const genre   = wrapper.find("[class*='element-14']").text().trim(); // élément genre

    if (title) events.push({ date, title, genre, link, image, lieu: "Hexagone" });
  });

  console.log(`Hexagone : ${events.length} événements récupérés`);
  return events;
}
