// ─── MAIRIE DE LA TOUR DU PIN ─────────────────────────────────────────────────
// Technique : Puppeteer (vostickets.net, JS obligatoire)
// Structure : grille de vignettes .ticket-mur-vignette-entiere
//   - .ticket-murLegende .col-12:first-child → titre
//   - .ticket-murLegende .col-12:last-child  → "Le MERCREDI 6 MAI 2026 à 16H00"
//   - images embarquées en base64 → pas d'URL exploitable → placeholder
//
// ⚠ Si l'URL change : modifier PAGE_URL
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_URL = "https://www.vostickets.net/billet/FR/catalogue-LA_TOUR_DU_PIN.wb";

export async function scrapeTourDuPin(browser) {
  const page = await browser.newPage();
  try {
    await page.goto(PAGE_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector(".ticket-mur-vignette-entiere", { timeout: 10000 }).catch(() => {});

    const events = await page.evaluate((pageUrl) => {
      return [...document.querySelectorAll(".ticket-mur-vignette-entiere")].map(card => {
        const legend = card.querySelector(".ticket-murLegende");
        if (!legend) return null;

        const cols = [...legend.querySelectorAll(".col-12")]
          .map(el => el.textContent.trim())
          .filter(t => t.length > 0);
        const title = cols[0] || "";
        // Retire le "Le" introductif : "Le\nMERCREDI 6 MAI 2026 à 16H00"
        const date = (cols[1] || "").replace(/^Le\s*/i, "").trim();

        return { title, date, genre: "", link: pageUrl, image: "", lieu: "La Tour du Pin" };
      }).filter(e => e?.title);
    }, PAGE_URL);

    return events;
  } finally {
    await page.close();
  }
}
