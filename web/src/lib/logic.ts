/* Logique pure partagée entre le build et le navigateur : tirage du jour, filtres, tri, formats. */

export type Lang = "fr" | "en";
export type Kind = "film" | "book" | "series";
export const KINDS: Kind[] = ["film", "book", "series"];
export type SortKey = "country" | "imdb" | "rt" | "new" | "old" | "runtime" | "pop";

/** Les tris proposés à chaque type d'œuvre. pop : articles Wikipédia (livre) ou votes TMDB (série). */
export const SORTS: Record<Kind, SortKey[]> = {
  film: ["country", "imdb", "rt", "new", "old", "runtime"],
  book: ["country", "pop", "new", "old"],
  series: ["country", "pop", "new", "old"],
};

/** Ce que le catalogue sait d'une œuvre pour la filtrer et la trier (lu dans les attributs data-*). */
export interface Item {
  kind: Kind;
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
  pop: number | null;
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

/** Clé de suivi d'une œuvre : « film:FR », « book:FR », « series:FR ». */
export const workKey = (kind: Kind, iso: string) => `${kind}:${iso}`;

/**
  Suivi « vu » et « ma liste ». Le nouveau stockage gagne s'il existe ; sinon on reprend une fois
  l'ancien (codes pays de films seuls, « FR ») en les passant au format « film:FR ».
*/
export function loadTracking(raw: string | null, legacy: string | null): Set<string> {
  if (raw !== null) return parseIdSet(raw);
  return new Set([...parseIdSet(legacy)].map((k) => (k.includes(":") ? k : workKey("film", k))));
}

export type MapMode = Kind | "all";
export interface MapState { state: "none" | "open" | "seen"; seen: number; of: number }

/** Ce que la carte montre d'un pays : aucune œuvre du type choisi, à voir, ou vu (avec le compte en mode Tout). */
export function mapState(mode: MapMode, avail: Kind[], iso: string, seen: Set<string>): MapState {
  const kinds = mode === "all" ? avail : avail.filter((k) => k === mode);
  if (!kinds.length) return { state: "none", seen: 0, of: 0 };
  const n = kinds.filter((k) => seen.has(workKey(k, iso))).length;
  return { state: n ? "seen" : "open", seen: n, of: kinds.length };
}

/** Les pays dont toutes les œuvres sont vues (jamais un pays sans œuvre). */
export function completedCountries(avail: Record<string, Kind[]>, seen: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const [iso, kinds] of Object.entries(avail)) {
    if (kinds.length && kinds.every((k) => seen.has(workKey(k, iso)))) out.add(iso);
  }
  return out;
}

/** Chemin de la fiche d'un pays dans chaque langue, et celui de l'ancienne fiche film (qui redirige). */
export const countrySlug = (lang: Lang, iso: string) => `${lang === "fr" ? "pays" : "country"}/${iso.toLowerCase()}/`;
export const legacySlug = (_lang: Lang, iso: string) => `film/${iso.toLowerCase()}/`;

/** Année en tête d'une chaîne (« 2004 », « 2004-05-01 »), sinon null. */
export function yearOf(s: string): number | null {
  const m = /^(\d{4})/.exec(s || "");
  return m ? Number(m[1]) : null;
}

/** Dessin de la couverture typographique : une teinte (6) et une mise en page (4), stables pour un pays et un titre. */
export function coverSeed(iso: string, title: string): { tone: number; layout: number } {
  let h = 7;
  for (const c of iso + "|" + title) h = (h * 31 + c.charCodeAt(0)) % 100003;
  let g = 5;
  for (const c of iso) g = (g * 41 + c.charCodeAt(0)) % 9973;
  return { tone: h % 6, layout: g % 4 };
}

/** Numéro du jour local : le pays du jour change à minuit chez le visiteur. */
export function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/** Même pays toute la journée, en sautant les pays déjà vus tant qu'il en reste. */
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
  if (flt.lang && f.lang !== flt.lang) return false;
  // durée, « en France » et animation n'existent que pour les films
  if (f.kind === "film") {
    if (flt.duration && runtimeBucket(f.runtime) !== flt.duration) return false;
    if (flt.fr && !f.fr) return false;
    if (flt.anim && !f.anim) return false;
  }
  const key = workKey(f.kind, f.iso);
  if (flt.unseen && ctx.seen.has(key)) return false;
  if (flt.list && !ctx.list.has(key)) return false;
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
    pop: byNumber((f) => f.pop, -1),
  }[key];
  return [...items].sort((a, b) => cmp(a, b) || byCountry(a, b));
}

export function fmtRating(v: number, kind: "imdb" | "tmdb" | "rt", lang: Lang): string {
  const loc = lang === "fr" ? "fr-FR" : "en-US";
  if (kind === "rt") return lang === "fr" ? `${Math.round(v)} %` : `${Math.round(v)}%`;
  return v.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Classe de taille d'un titre d'affiche : s jusqu'à 22 caractères, m jusqu'à 40, l au-delà. */
export function titleLen(title: string): "s" | "m" | "l" {
  const n = [...title].length;
  return n <= 22 ? "s" : n <= 40 ? "m" : "l";
}

/** Taille du nom de pays en grand : s jusqu'à 9 caractères, m jusqu'à 16, l au-delà. */
export function nameLen(name: string): "s" | "m" | "l" {
  const n = [...name].length;
  return n <= 9 ? "s" : n <= 16 ? "m" : "l";
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

export interface LinkTarget { id: "wikipedia" | "tmdb" | "source"; url: string }

/**
  Liens externes d'un livre ou d'une série, sans jamais en inventer : pas de qid (livre absent de Wikidata)
  donc pas de Wikipédia, pas de tmdb_id (série absente de TMDB) donc pas de TMDB. La source citée s'ajoute
  dès qu'elle diffère de la page déjà proposée.
*/
export function workLinks(kind: "book" | "series", w: { qid?: string; tmdb_id?: number | null; source_url?: string; wiki_fr?: string; wiki_en?: string }, lang: Lang): LinkTarget[] {
  const out: LinkTarget[] = [];
  let own = "";
  if (kind === "book") {
    const article = (lang === "fr" ? w.wiki_fr : w.wiki_en) || (w.qid ? wikiUrl(w.qid, lang) : "");
    if (article) out.push({ id: "wikipedia", url: article });
    if (w.qid) own = `https://www.wikidata.org/wiki/${w.qid}`;
  }
  if (kind === "series" && w.tmdb_id) { own = `https://www.themoviedb.org/tv/${w.tmdb_id}`; out.push({ id: "tmdb", url: own }); }
  if (w.source_url && w.source_url !== own) out.push({ id: "source", url: w.source_url });
  return out;
}

/** Le résumé dans la langue de la page, ou l'autre langue en repli (avec la langue réelle du texte), ou rien si les deux manquent. */
export function pickOverview(fr: string | undefined, en: string | undefined, lang: Lang): { text: string; lang: Lang; fallback: boolean } {
  const own = (lang === "fr" ? fr : en) || "";
  if (own) return { text: own, lang, fallback: false };
  const other: Lang = lang === "fr" ? "en" : "fr";
  const text = (other === "fr" ? fr : en) || "";
  return { text, lang: text ? other : lang, fallback: !!text };
}

export type Box = [number, number, number, number];
const union = (bs: Box[]): Box => bs.reduce((u, b) => [Math.min(u[0], b[0]), Math.min(u[1], b[1]), Math.max(u[2], b[2]), Math.max(u[3], b[3])]);
const surf = (bs: Box[]) => bs.reduce((s, b) => s + (b[2] - b[0]) * (b[3] - b[1]), 0);

/** Cadre à zoomer pour un pays donné par les boîtes de ses morceaux (projetés, largeur de carte W).
 *  Un pays coupé par l'antiméridien (Fidji, îles Chukotka) a des morceaux aux deux bords :
 *  on ne garde que le côté le plus étendu. */
export function focusBox(boxes: Box[], W: number): Box | null {
  if (!boxes.length) return null;
  const u = union(boxes);
  if (u[2] - u[0] <= W * 0.6) return u;
  // un morceau lui-même à cheval sur l'antiméridien a une boîte de toute la largeur : on l'écarte
  const parts = boxes.filter((b) => b[2] - b[0] <= W * 0.6);
  const left = parts.filter((b) => (b[0] + b[2]) / 2 < W / 2);
  const right = parts.filter((b) => (b[0] + b[2]) / 2 >= W / 2);
  if (!left.length && !right.length) return null;
  const side = !left.length ? right : !right.length ? left : surf(right) >= surf(left) ? right : left;
  return union(side);
}

/** Un film pour la liste à importer dans Letterboxd. */
export interface LbFilm { iso: string; country: string; title: string; year: number | null; tmdb: number | null; imdb: string; level: string }

/** Champ CSV au format d'import Letterboxd : guillemets si virgule ou guillemet, guillemet échappé par une barre. */
const lbField = (v: string | number | null) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '\\"').replace(/\n/g, " ")}"` : s;
};

/** Liste des films au format d'import Letterboxd (https://letterboxd.com/about/importing-data/), triée par pays. */
export function letterboxdCsv(films: LbFilm[], lang: Lang): string {
  const lvl = lang === "fr" ? "niveau" : "level";
  const rows = films.filter((f) => f.title)
    .sort((a, b) => a.country.localeCompare(b.country, lang))
    .map((f) => [f.tmdb, f.imdb, f.title, f.year, `${f.country} · ${lvl} ${f.level}`].map(lbField).join(","));
  return ["tmdbID,imdbID,Title,Year,Review", ...rows].join("\n");
}

/** Sous ce nombre de votes, une note IMDb ou TMDB ne dit rien (10/10 sur un vote) : on ne l'affiche pas. */
export const MIN_RATING_VOTES = 10;
export function solidRating<T extends { value: number; votes?: number }>(r: T | null | undefined): T | null {
  if (!r) return null;
  return r.votes != null && r.votes < MIN_RATING_VOTES ? null : r;
}
