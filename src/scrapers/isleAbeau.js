// ─── LE MILLÉ — L'ISLE D'ABEAU ───────────────────────────────────────────────
// Technique : Puppeteer via helper vostickets.net partagé
// ⚠ Si l'URL change : modifier PAGE_URL
// ─────────────────────────────────────────────────────────────────────────────

import { scrapeVosTickets } from "./_vostickets.js";

const PAGE_URL = "https://www.vostickets.net/billet/FR/catalogue-ISLE_D_ABEAU.wb";

export async function scrapeIsleAbeau(browser) {
  return scrapeVosTickets(browser, PAGE_URL, "Le Millé - L'Isle d'Abeau");
}
