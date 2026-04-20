// ─── ESPACE MORGADO (Bourgoin-Jallieu) ───────────────────────────────────────
// Technique : Puppeteer (page construite avec Zyro/Hostinger, JS obligatoire)
// Structure : site builder sans hiérarchie HTML cohérente — chaque texte est
//   un élément isolé (<h3>, <strong>, <p>). On repère les événements en
//   cherchant les liens "Billetterie" (helloasso), qui apparaissent un par
//   spectacle dans l'ordre de la page.
//
// Algorithme :
//   1. Récupère les éléments "Billetterie" avec leur lien → 1 lien = 1 event
//   2. Pour chaque lien, cherche le h3 court le plus proche avant lui = titre
//   3. Cherche la date (regex) dans les éléments proches
//   4. Associe les images de spectacle (desktop) dans le même ordre
//
// ⚠ Le site bloque les User-Agents simples mais accepte Puppeteer.
//   Le certificat SSL est auto-signé → ignoreCertificateErrors obligatoire.
// ⚠ Si l'URL change : modifier PAGE_URL
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_URL = "https://espacemorgado.fr/programmation";
const DATE_RE = /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+\d+\s+\w+\s+à\s+\d+[hH]/i;

export async function scrapeMorgado(browser) {
  const page = await browser.newPage();

  // Le certificat SSL du site est invalide → on l'ignore
  await page.setBypassCSP(true);
  try {
    await page.goto(PAGE_URL, {
      waitUntil: "networkidle2",
      timeout: 30000,
      ignoreHTTPSErrors: true,
    });

    const events = await page.evaluate((dateReSrc) => {
      const DATE_RE = new RegExp(dateReSrc, "i");

      // ── Images de spectacles (version desktop, sans logo) ──────────────────
      const images = [...document.querySelectorAll(".image--grid.image-wrapper--desktop img")]
        .map(img => img.src)
        .filter(src => !src.includes("logo"));

      // ── Tous les noeuds texte (h3 + strong) dans l'ordre du DOM ───────────
      const allNodes = [...document.querySelectorAll("h3, strong")].map(el => ({
        el,
        text: el.textContent.trim(),
      })).filter(n => n.text.length > 0);

      // ── Liens Billetterie (un par événement, dans l'ordre) ─────────────────
      const billLinks = [...document.querySelectorAll("a.grid-button")]
        .filter(a => a.textContent.trim() === "Billetterie")
        .map(a => a.href);

      // Tous les éléments billetterie dans l'ordre
      const billEls = [...document.querySelectorAll("a.grid-button")]
        .filter(a => a.textContent.trim() === "Billetterie");

      // Convertit un slug helloasso en titre lisible ("pacome-rotondo" → "Pacome Rotondo")
      function slugToTitle(url) {
        const slug = url.split("/evenements/")[1] || "";
        return slug.split("-")
          .filter(w => w.length > 0)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }

      const SKIP = ["Prochains spectacles", "Retrouvez", "Venez nous voir", "€", "Billetterie"];
      const isSkip = (t) => SKIP.some(s => t.includes(s));
      const isTitleH3 = (n) =>
        n.el.tagName === "H3" && !DATE_RE.test(n.text) && n.text.length <= 60 && !isSkip(n.text);

      // ── Assignation des dates par proximité DOM ─────────────────────────────
      // Chaque date node se voit assigner le lien billetterie le plus proche
      // (en nombre de noeuds dans le DOM). Chaque lien ne peut recevoir qu'une date.
      const allElsOrdered = [...document.querySelectorAll("*")];
      const posOf = (el) => allElsOrdered.indexOf(el);

      const dateNodes = allNodes.filter(n => DATE_RE.test(n.text));
      const assigned = new Array(billEls.length).fill(null); // date assignée à chaque bill

      // Trie les dates par distance croissante à chaque bill et assigne
      for (const dn of dateNodes) {
        const dnPos = posOf(dn.el);
        const dists = billEls.map((b, i) => ({ i, dist: Math.abs(posOf(b) - dnPos) }));
        dists.sort((a, b) => a.dist - b.dist);
        for (const { i } of dists) {
          if (!assigned[i]) { assigned[i] = dn.text; break; }
        }
      }

      const results = [];

      billEls.forEach((billEl, idx) => {
        const prevBillEl = billEls[idx - 1] || null;

        // Fenêtre stricte : noeuds entre le lien précédent et le courant
        const strictWindow = allNodes.filter(n => {
          const afterPrev = !prevBillEl ||
            (prevBillEl.compareDocumentPosition(n.el) & Node.DOCUMENT_POSITION_FOLLOWING);
          const beforeCurrent =
            billEl.compareDocumentPosition(n.el) & Node.DOCUMENT_POSITION_PRECEDING;
          return afterPrev && beforeCurrent;
        });

        // Titre = premier h3 court non-date dans la fenêtre stricte
        let title = "";
        for (const n of strictWindow) {
          if (!isTitleH3(n)) continue;
          title = n.text;
          break;
        }
        if (!title) title = slugToTitle(billEl.href);

        // Genre = deuxième h3 court non-date dans la fenêtre stricte
        let genre = "";
        let titleFound = false;
        for (const n of strictWindow) {
          if (!isTitleH3(n)) continue;
          if (!titleFound) { titleFound = true; continue; }
          genre = n.text;
          break;
        }

        results.push({
          title,
          date: assigned[idx] || "",
          genre,
          link: billEl.href,
          image: images[idx] || "",
          lieu: "Espace Morgado",
        });
      });

      return results;
    }, DATE_RE.source);

    return events;
  } finally {
    await page.close();
  }
}
