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
//   4. Associe les images : passe 1 = mots du titre dans le nom de fichier,
//      passe 2 = fenêtre DOM avant le bouton, passe 3 = fenêtre après
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
      const imageEls = [...document.querySelectorAll(".image--grid.image-wrapper--desktop img")]
        .filter(img => !img.src.includes("logo"));

      // ── Tous les noeuds texte (h3 + strong) dans l'ordre du DOM ───────────
      const allNodes = [...document.querySelectorAll("h3, strong")].map(el => ({
        el,
        text: el.textContent.trim(),
      })).filter(n => n.text.length > 0);

      // ── Éléments Billetterie dans l'ordre ──────────────────────────────────
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

      // Renvoie la fenêtre de noeuds entre le bouton précédent et le courant
      function strictWindow(billEl, prevBillEl) {
        return allNodes.filter(n => {
          const afterPrev = !prevBillEl ||
            (prevBillEl.compareDocumentPosition(n.el) & Node.DOCUMENT_POSITION_FOLLOWING);
          const beforeCurrent =
            billEl.compareDocumentPosition(n.el) & Node.DOCUMENT_POSITION_PRECEDING;
          return afterPrev && beforeCurrent;
        });
      }

      // ── Pré-calcul des titres (nécessaire pour la passe 1 images) ──────────
      const titles = billEls.map((billEl, idx) => {
        const win = strictWindow(billEl, billEls[idx - 1] || null);
        for (const n of win) {
          if (isTitleH3(n)) return n.text;
        }
        return slugToTitle(billEl.href);
      });

      // ── Assignation des dates ───────────────────────────────────────────────
      const allElsOrdered = [...document.querySelectorAll("*")];
      const posOf = (el) => allElsOrdered.indexOf(el);

      const dateNodes = allNodes.filter(n => DATE_RE.test(n.text));
      const assignedDates = new Array(billEls.length).fill(null);

      for (const dn of dateNodes) {
        const dnPos = posOf(dn.el);
        const dists = billEls.map((b, i) => ({ i, dist: Math.abs(posOf(b) - dnPos) }));
        dists.sort((a, b) => a.dist - b.dist);
        for (const { i } of dists) {
          if (!assignedDates[i]) { assignedDates[i] = dn.text; break; }
        }
      }

      // ── Assignation des images ──────────────────────────────────────────────
      const usedImgSrcs = new Set();
      const assignedImages = new Array(billEls.length).fill(null);

      // Dérive des mots-clés pertinents depuis le titre et le slug helloasso
      function imgKeys(title, href) {
        const stopWords = new Set(["les", "des", "une", "sur", "par", "avec", "pour", "dans", "est", "son", "chez"]);
        const clean = s => s.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9 ]/g, " ");
        const words = new Set();
        for (const src of [title, href]) {
          clean(src).split(/\s+/)
            .filter(w => w.length > 3 && !stopWords.has(w))
            .forEach(w => words.add(w));
        }
        return [...words];
      }

      // Passe 1 : mots du titre/slug dans le nom de fichier image
      for (let i = 0; i < billEls.length; i++) {
        const keys = imgKeys(titles[i], billEls[i].href);
        const match = imageEls.find(img => {
          if (usedImgSrcs.has(img.src)) return false;
          const fname = img.src.split("/").pop().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return keys.some(k => fname.includes(k));
        });
        if (match) { assignedImages[i] = match.src; usedImgSrcs.add(match.src); }
      }

      // Passe 2 : fenêtre stricte avant le bouton
      billEls.forEach((billEl, i) => {
        if (assignedImages[i]) return;
        const prevBill = billEls[i - 1] || null;
        for (const imgEl of imageEls) {
          if (usedImgSrcs.has(imgEl.src)) continue;
          const afterPrev = !prevBill ||
            (prevBill.compareDocumentPosition(imgEl) & Node.DOCUMENT_POSITION_FOLLOWING);
          const beforeCurrent =
            billEl.compareDocumentPosition(imgEl) & Node.DOCUMENT_POSITION_PRECEDING;
          if (afterPrev && beforeCurrent) {
            assignedImages[i] = imgEl.src;
            usedImgSrcs.add(imgEl.src);
            break;
          }
        }
      });

      // Passe 3 : fallback après le bouton
      billEls.forEach((billEl, i) => {
        if (assignedImages[i]) return;
        const nextBill = billEls[i + 1] || null;
        for (const imgEl of imageEls) {
          if (usedImgSrcs.has(imgEl.src)) continue;
          const afterCurrent =
            billEl.compareDocumentPosition(imgEl) & Node.DOCUMENT_POSITION_FOLLOWING;
          const beforeNext = !nextBill ||
            (nextBill.compareDocumentPosition(imgEl) & Node.DOCUMENT_POSITION_PRECEDING);
          if (afterCurrent && beforeNext) {
            assignedImages[i] = imgEl.src;
            usedImgSrcs.add(imgEl.src);
            break;
          }
        }
      });

      // ── Construction des résultats ──────────────────────────────────────────
      return billEls.map((billEl, idx) => {
        const win = strictWindow(billEl, billEls[idx - 1] || null);
        const title = titles[idx];

        let genre = "";
        let titleFound = false;
        for (const n of win) {
          if (!isTitleH3(n)) continue;
          if (!titleFound) { titleFound = true; continue; }
          genre = n.text;
          break;
        }

        return {
          title,
          date: assignedDates[idx] || "",
          genre,
          link: billEl.href,
          image: assignedImages[idx] || "",
          lieu: "Espace Morgado",
        };
      });
    }, DATE_RE.source);

    return events;
  } finally {
    await page.close();
  }
}
