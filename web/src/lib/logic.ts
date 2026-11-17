/* Logique pure partagée entre le build et le navigateur : tirage du jour, filtres, tri, formats. */

export type Lang = "fr" | "en";
export type SortKey = "country" | "imdb" | "rt" | "new" | "old" | "runtime";

/** Ce que le catalogue sait d'un film pour le filtrer et le trier (lu dans les attributs data-*). */
export interface Item {
  iso: string;
  country: string;
  title: string;
  alt: string;
  year: number | null;
  runtime: number | null;
  level: string;
  continent: string;
  lang: string;
  anim: boolean;
  fr: boolean;
  imdb: number | null;
  rt: number | null;
}

export interface Filters {
  q: string;
  continent: string;
  level: string;
  decade: string;
  duration: string;
  lang: string;
  fr: boolean;
  anim: boolean;
  unseen: boolean;
  list: boolean;
}

/** Numéro du jour local : le film du jour change à minuit chez le visiteur. */
export function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/** Même film toute la journée, en sautant les films déjà vus tant qu'il en reste. */
export function pickDaily(pool: string[], seen: Set<string>, d: Date): string | null {
  if (!pool.length) return null;
  const start = (dayNumber(d) * 7919) % pool.length;
  for (let i = 0; i < pool.length; i++) {
    const iso = pool[(start + i) % pool.length];
    if (!seen.has(iso)) return iso;
  }
  return pool[start];
}

/** Lit un tableau de codes pays stocké en JSON ; tout le reste donne un ensemble vide. */
export function parseIdSet(raw: string | null): Set<string> {
  try {
    const a = JSON.parse(raw || "[]");
    return new Set(Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function runtimeBucket(min: number | null): "" | "short" | "mid" | "long" {
  if (!min) return "";
  return min < 90 ? "short" : min <= 120 ? "mid" : "long";
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function matches(f: Item, flt: Filters, ctx: { seen: Set<string>; list: Set<string> }): boolean {
  if (flt.continent && f.continent !== flt.continent) return false;
  if (flt.level && f.level !== flt.level) return false;
  if (flt.decade && (!f.year || Math.floor(f.year / 10) * 10 !== Number(flt.decade))) return false;
  if (flt.duration && runtimeBucket(f.runtime) !== flt.duration) return false;
  if (flt.lang && f.lang !== flt.lang) return false;
  if (flt.fr && !f.fr) return false;
  if (flt.anim && !f.anim) return false;
  if (flt.unseen && ctx.seen.has(f.iso)) return false;
  if (flt.list && !ctx.list.has(f.iso)) return false;
  const q = fold(flt.q.trim());
  if (q && !fold(`${f.country} ${f.title} ${f.alt}`).includes(q)) return false;
  return true;
}

/** Les valeurs absentes vont toujours en fin de liste, quel que soit le sens du tri. */
function byNumber(get: (f: Item) => number | null, dir: 1 | -1) {
  return (a: Item, b: Item) => {
    const x = get(a), y = get(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (x - y) * dir;
  };
}

export function sortItems(items: Item[], key: SortKey, lang: Lang): Item[] {
  const col = new Intl.Collator(lang);
  const byCountry = (a: Item, b: Item) => col.compare(a.country, b.country);
  const cmp = {
    country: byCountry,
    imdb: byNumber((f) => f.imdb, -1),
    rt: byNumber((f) => f.rt, -1),
    new: byNumber((f) => f.year, -1),
    old: byNumber((f) => f.year, 1),
    runtime: byNumber((f) => f.runtime, 1),
  }[key];
  return [...items].sort((a, b) => cmp(a, b) || byCountry(a, b));
}

export function fmtRating(v: number, kind: "imdb" | "tmdb" | "rt", lang: Lang): string {
  const loc = lang === "fr" ? "fr-FR" : "en-US";
  if (kind === "rt") return lang === "fr" ? `${Math.round(v)} %` : `${Math.round(v)}%`;
  return v.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Classe de taille du titre du billboard : s jusqu'à 22 caractères, m jusqu'à 40, l au-delà. */
export function titleLen(title: string): "s" | "m" | "l" {
  const n = [...title].length;
  return n <= 22 ? "s" : n <= 40 ? "m" : "l";
}

/** Titre d'un livre ou d'une série : langue de la page, puis titre original, puis l'autre langue. */
export function workTitle(w: { orig: string; fr: string; en: string }, lang: Lang): string {
  return (lang === "fr" ? w.fr : w.en) || w.orig || (lang === "fr" ? w.en : w.fr) || "";
}

/** Article Wikipédia d'un élément Wikidata dans la langue de la page (Wikidata redirige). */
export const wikiUrl = (qid: string, lang: Lang) =>
  `https://www.wikidata.org/wiki/Special:GoToLinkedPage/${lang}wiki/${qid}`;

/** Sous ces seuils (articles Wikipédia pour un livre, votes TMDB pour une série), le choix est fragile. */
const THIN = { book: 10, series: 50 } as const;
export const isThin = (kind: keyof typeof THIN, n: number) => n < THIN[kind];

/** « de Goethe », « d’Ismaïl Kadaré », « by Goethe ». Pas d’élision devant h : « de Hans Christian Andersen ». */
export function byAuthor(name: string, lang: Lang): string {
  if (lang === "en") return `by ${name}`;
  return /^[aeiouyàâäéèêëîïôöùûüœæ]/i.test(name) ? `d’${name}` : `de ${name}`;
}
