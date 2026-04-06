// ─── UTILITAIRES PARTAGÉS ────────────────────────────────────────────────────
// Ce fichier contient des fonctions réutilisées par plusieurs scrapers.
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

// Table de correspondance mois français → numéro (pour toDateISO)
export const MONTHS = {
  jan:1, janv:1, janvier:1,
  fév:2, fevr:2, février:2, fev:2,
  mar:3, mars:3,
  avr:4, avril:4,
  mai:5,
  jun:6, juin:6,
  jui:7, juil:7, juillet:7,
  aoû:8, aout:8, août:8,
  sep:9, sept:9, septembre:9,
  oct:10, octobre:10,
  nov:11, novembre:11,
  déc:12, dec:12, décembre:12
};

// Convertit une date en texte français en format ISO (YYYY-MM-DD)
// Exemples : "17 octobre" → "2025-10-17"
//            "Vendredi 14 mars 2026 à 20h30" → "2026-03-14"
// Si l'année est absente, on suppose : mois ≥ août → 2025, sinon → 2026
export function toDateISO(dateStr) {
  if (!dateStr) return "";
  // Normalise la chaîne : minuscules, remplace séparateurs par des espaces
  const s = dateStr.toLowerCase().replace(/[.\-|]/g, " ").replace(/\s+/g, " ").trim();

  let day, month, year;

  // Essaie deux formats :
  // m1 : "17 octobre [2026]"  (chiffre avant le mois)
  // m2 : "octobre 17 [2026]"  (mois avant le chiffre, moins courant)
  const m1 = s.match(/(\d{1,2})\s+([a-zéûôèêàû]{3,})\s*(?:(\d{4}))?/);
  const m2 = s.match(/([a-zéûôèêàû]{3,})\s+(\d{1,2})(?:\s+(\d{4}))?/);

  const m2month = m2 ? (MONTHS[m2[1].slice(0,4)] || MONTHS[m2[1].slice(0,3)]) : undefined;
  const useM2   = m2 && m2month && (!m1 || m2.index < m1.index);
  if (useM2) {
    month = m2month;
    day   = parseInt(m2[2]);
    year  = m2[3] ? parseInt(m2[3]) : undefined;
  } else if (m1) {
    day   = parseInt(m1[1]);
    const key = m1[2].slice(0, 4);
    month = MONTHS[key] || MONTHS[m1[2].slice(0, 3)];
    year  = m1[3] ? parseInt(m1[3]) : undefined;
  }

  if (!day || !month) return "";
  // Heuristique saison : août-décembre = année courante, janvier-juillet = année suivante
  if (!year) year = month >= 8 ? 2025 : 2026;
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

// Récupère l'image Open Graph (og:image) d'une page web
// Utilisé par les scrapers dont les listings n'ont pas d'image directe
// (Ilyade, Théâtre en Rond, Le Laussy...)
export async function fetchOgImage(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (GrandAngleScraper/1.0)" },
      timeout: 10000
    });
    const $ = cheerio.load(data);
    // La balise og:image est dans le <head> de la page
    return $('meta[property="og:image"]').attr("content") || "";
  } catch {
    return ""; // si la page est inaccessible, on retourne une image vide
  }
}
