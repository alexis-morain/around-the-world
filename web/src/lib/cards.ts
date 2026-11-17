/*
  Cartes d'œuvres en HTML. Une seule source pour le build (Astro, via set:html) et le navigateur
  (rangées « ma liste », pays du jour tiré côté client), donc le même rendu des deux côtés.
*/
import type { CardData, ClientCountry } from "./films";
import { t } from "./i18n";
import { KINDS, type Item, type Lang } from "./logic";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

interface ImgOpts { label?: boolean; eager?: boolean }

/** L'image d'une œuvre : l'affiche ou la couverture, sinon une version typographique dessinée en CSS. */
export function imgHtml(d: CardData, lang: Lang, { label = false, eager = false }: ImgOpts = {}): string {
  if (d.img) {
    return `<img src="${esc(d.img)}" alt="${label ? esc(d.imgAlt) : ""}" width="342" height="513" loading="${eager ? "eager" : "lazy"}" decoding="async">`;
  }
  const a11y = label ? `role="img" aria-label="${esc(d.imgAlt)}"` : `aria-hidden="true"`;
  if (d.kind === "book") {
    return `<span class="tbook" data-tone="${d.tone}" data-layout="${d.layout}" data-size="${d.size}" ${a11y}><span class="tb-in">` +
      `<span class="tb-iso" aria-hidden="true">${esc(d.iso)}</span>` +
      `<span class="tb-title">${esc(d.title)}</span>` +
      `<span class="tb-foot">${d.sub ? `<span class="tb-author">${esc(d.sub)}</span>` : ""}<span class="tb-country">${esc(d.country)}</span></span></span></span>`;
  }
  return `<span class="tpost" data-tone="${d.tone}" data-size="${d.size}" ${a11y}><span class="tp-in">` +
    `<span class="tp-title">${esc(d.title)}</span>` +
    `<span class="tp-foot">${d.year ? `<span>${esc(d.year.slice(0, 4))}</span>` : ""}<span>${esc(d.country)}</span></span></span></span>`;
}

interface CardOpts { mixed?: boolean; lead?: boolean; item?: Item; eager?: boolean }

/** Attributs data-* lus par le catalogue pour filtrer et trier. */
function itemAttrs(it: Item): string {
  const a: Record<string, string | number> = {
    "data-country": it.country, "data-title": it.title, "data-alt": it.alt, "data-year": it.year ?? "", "data-runtime": it.runtime ?? "",
    "data-level": it.level, "data-continent": it.continent, "data-lang": it.lang, "data-anim": it.anim ? "1" : "",
    "data-fr": it.fr ? "1" : "", "data-imdb": it.imdb ?? "", "data-rt": it.rt ?? "", "data-pop": it.pop ?? "",
  };
  return Object.entries(a).map(([k, v]) => `${k}="${esc(v)}"`).join(" ");
}

/** Une carte cliquable : ouvre la fiche du pays (modale sur l'accueil et le catalogue). */
export function cardHtml(d: CardData, lang: Lang, { mixed = false, lead = false, item, eager = false }: CardOpts = {}): string {
  const L = t(lang);
  const K = L.kind[d.kind];
  const cty = mixed ? `${esc(d.country)} · ${esc(K.name)}` : esc(d.country);
  return `<a class="card${lead ? " card-lead" : ""}" href="${esc(d.href)}" data-kind="${d.kind}" data-iso="${esc(d.iso)}" data-key="${esc(d.key)}"${item ? " " + itemAttrs(item) : ""}>` +
    (lead ? `<span class="lead-kind"><span class="rule" aria-hidden="true"></span>${esc(K.the)}</span>` : "") +
    `<span class="card-img">${imgHtml(d, lang, { eager })}<span class="card-tags"><span class="tag seen">${esc(K.seenTag)}</span><span class="tag list">${esc(L.rows.list)}</span></span></span>` +
    `<span class="card-cty">${cty}</span><span class="card-ttl">${esc(d.title)}</span>` +
    (d.sub ? `<span class="card-by">${esc(d.sub)}</span>` : "") +
    `</a>`;
}

/** Emplacement d'une œuvre manquante, à la taille d'une carte : dit clairement qu'il n'y en a pas. */
export function emptyHtml(kind: (typeof KINDS)[number], lang: Lang): string {
  const K = t(lang).kind[kind];
  return `<span class="card card-lead card-empty"><span class="lead-kind"><span class="rule" aria-hidden="true"></span>${esc(K.the)}</span>` +
    `<span class="card-img card-img-empty"><span>${esc(K.none)}</span></span></span>`;
}

/** Les trois œuvres du pays côte à côte, à la même taille. */
export function trioHtml(c: ClientCountry, lang: Lang, eager = false): string {
  return KINDS.map((k) => `<li>${c.works[k] ? cardHtml(c.works[k]!, lang, { lead: true, eager }) : emptyHtml(k, lang)}</li>`).join("");
}

/** Tuile d'un pays : ses trois images en bande, pour les rangées par continent. */
export function tileHtml(c: ClientCountry, lang: Lang): string {
  const L = t(lang);
  const n = KINDS.filter((k) => c.works[k]).length;
  const slots = KINDS.map((k) => {
    const d = c.works[k];
    if (!d) return `<span class="ct-w ct-empty" aria-hidden="true"></span>`;
    return `<span class="ct-w card-img" data-key="${esc(d.key)}">${imgHtml(d, lang)}<span class="ct-seen" aria-hidden="true"></span></span>`;
  }).join("");
  return `<a class="ctile" href="${esc(c.works.film?.href || c.works.book?.href || c.works.series!.href)}" data-iso="${esc(c.iso)}">` +
    `<span class="ct-strip">${slots}</span><span class="ct-name">${esc(c.name)}</span><span class="ct-n">${esc(L.tileWorks(n))}</span></a>`;
}
