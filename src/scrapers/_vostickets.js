// ─── HELPER PARTAGÉ — vostickets.net ─────────────────────────────────────────
// Réutilisé par tous les catalogues hébergés sur vostickets.net.
// Structure commune : grille .ticket-mur-vignette-entiere
//   - .ticket-murLegende → cols de texte non-vides → [titre, date]
//   - Images embarquées en base64 → pas d'URL exploitable → placeholder
// ─────────────────────────────────────────────────────────────────────────────

export async function scrapeVosTickets(browser, pageUrl, lieu) {
  const page = await browser.newPage();
  try {
    await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector(".ticket-mur-vignette-entiere", { timeout: 10000 }).catch(() => {});

    return await page.evaluate((pageUrl, lieu) => {
      return [...document.querySelectorAll(".ticket-mur-vignette-entiere")].map(card => {
        const legend = card.querySelector(".ticket-murLegende");
        if (!legend) return null;
        const cols = [...legend.querySelectorAll(".col-12")]
          .map(el => el.textContent.trim())
          .filter(t => t.length > 0);
        const title = cols[0] || "";
        const date = (cols[1] || "").replace(/^Le\s*/i, "").trim();
        return { title, date, genre: "", link: pageUrl, image: "", lieu };
      }).filter(e => e?.title);
    }, pageUrl, lieu);
  } finally {
    await page.close();
  }
}
