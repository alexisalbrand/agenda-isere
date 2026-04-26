// ─── THÉÂTRE JEAN-VILAR (Bourgoin-Jallieu) ───────────────────────────────────
// Technique : WordPress REST API (/_embed pour l'image en une seule requête)
// Le titre HTML contient 3 parties encodées dans des <span> :
//   TITRE<span class="compagnie-etc"> | Genre</span>
//         <span class="date"><i>…</i> JJ mois AAAA</span>
//
// ⚠ Si l'URL change : modifier BASE_URL
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://theatre.bourgoinjallieu.fr";

export async function scrapeJeanVilar() {
  const { data } = await axios.get(
    `${BASE_URL}/wp-json/wp/v2/posts?per_page=50&_embed=true`,
    { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 15000 }
  );

  return data.map(post => {
    const $ = cheerio.load(post.title?.rendered || "");

    const title = $.root().clone().find("span").remove().end().text().trim();
    const genre = $(".compagnie-etc").text().replace(/^\s*\|\s*/, "").trim();
    const date  = $(".date").text().replace(/[^\w\sàéêèùûôîç]/gi, " ").trim();
    const image = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "";
    const link  = post.link || BASE_URL;

    return { title, date, genre, link, image, lieu: "Théâtre Jean-Vilar" };
  }).filter(e => e.title);
}
