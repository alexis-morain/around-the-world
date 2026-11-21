/* Données du site au build : films.json produit par scripts/export_site.py. */
import data from "../data/films.json";
import { pickOverview, coverSeed, fmtRating, workTitle, yearOf, countrySlug, solidRating, type Item, type Kind, type Lang, type LbFilm } from "./logic";
import { href, t } from "./i18n";

export interface Rating { value: number; votes?: number }
export interface Film {
  iso2: string; ccn3: string; latlng: [number, number] | null; continent: string; level: string;
  title: string; title_fr: string; title_en: string; year: string; lang: string; animation: boolean;
  runtime: number | null; metric: string; value: string; source: string; runner_up: string;
  tmdb_id: number | null; imdb_id: string; poster: string | null; poster_url: string; poster_credit: string;
  backdrop: string | null; overview_fr: string; overview_en: string;
  providers_fr: Record<string, string[]>; justwatch_fr: string;
  tmdb_top: string; fatw: string; video: string; note_fr: string;
  ratings?: { imdb: Rating | null; tmdb: Rating | null; rt: Rating | null };
  trailer?: string;
  book?: Book | null;
  series?: Series | null;
  /** Film le mieux noté du pays sur Letterboxd, quand il diffère du film retenu (scripts/letterboxd_best.py). */
  lb_best?: { tmdb_id: number; slug: string; year: string; orig: string; fr: string; en: string } | null;
}
/** Champs communs au livre et à la série après la fusion de la recherche (scripts/books_series.py). */
interface WorkMeta { overview_fr?: string; overview_en?: string; level: string; metric: string; value: string; source_url: string; research_note?: string }
/** Le livre du pays. qid peut être vide (absent de Wikidata), cover vide ou null (couverture typographique). */
export interface Book extends WorkMeta { orig: string; fr: string; en: string; author: string; author_en: string; year: string; qid: string; wiki_fr?: string; wiki_en?: string; links: number; cover: string | null; cover_credit: string }
/** La série du pays. tmdb_id et poster peuvent être null (série absente de TMDB). */
export interface Series extends WorkMeta { orig: string; fr: string; en: string; year: string; tmdb_id: number | null; poster: string | null; votes: number; lang: string }

export const IMG = "https://image.tmdb.org/t/p/";
export const CONTINENTS = ["europe", "africa", "middle_east", "asia", "americas", "oceania"];
export const LANG_FIX: Record<string, string> = { cn: "yue", zxx: "zxx", sh: "sr", mo: "ro", "fr/en": "fr" };

export const films: Film[] = (data as { films: Film[] }).films;
export const updated: string = (data as { updated: string }).updated;
export const nameToIso: Record<string, string> = (data as { name_to_iso: Record<string, string> }).name_to_iso;
export const hasFilm = (f: Film) => !!f.level;
export const withFilm = films.filter(hasFilm);
export const byIso = new Map(films.map((f) => [f.iso2, f]));

const regionNames: Partial<Record<Lang, Intl.DisplayNames>> = {};
const langNames: Partial<Record<Lang, Intl.DisplayNames>> = {};
export function countryName(iso: string, lang: Lang): string {
  regionNames[lang] ??= new Intl.DisplayNames([lang], { type: "region" });
  try { return regionNames[lang]!.of(iso) || iso; } catch { return iso; }
}
export function langName(code: string, lang: Lang): string {
  if (!code) return "";
  if (code === "zxx") return lang === "fr" ? "sans dialogue" : "no dialogue";
  if (code === "fr/en") return lang === "fr" ? "français et anglais" : "French and English";
  langNames[lang] ??= new Intl.DisplayNames([lang], { type: "language" });
  try { return langNames[lang]!.of(LANG_FIX[code] || code) || code; } catch { return code; }
}

export const localTitle = (f: Film, lang: Lang) => (lang === "fr" ? f.title_fr : f.title_en) || f.title;
export const overview = (f: Film, lang: Lang) => (lang === "fr" ? f.overview_fr || f.overview_en : f.overview_en || f.overview_fr);
/** Le résumé dans la langue de la page, ou l'autre langue en repli, avec la langue réelle du texte. */
export function overviewIn(f: Film, lang: Lang): { text: string; lang: Lang; fallback: boolean } {
  return pickOverview(f.overview_fr, f.overview_en, lang);
}
export function posterSrc(f: Film, size: string): string {
  if (f.poster) return `${IMG}${size}${f.poster}`;
  return f.poster_url ? `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${f.poster_url.replace(/^\//, "")}` : "";
}
export const backdropSrc = (f: Film, size = "w1280") => (f.backdrop ? `${IMG}${size}${f.backdrop}` : "");
export const yearNum = (f: Film) => (/^\d{4}/.test(f.year) ? Number(f.year.slice(0, 4)) : null);
export const onSubscription = (f: Film) => ["flatrate", "free", "ads"].some((k) => (f.providers_fr?.[k] || []).length);
export const watchableFr = (f: Film) => Object.values(f.providers_fr || {}).some((l) => l.length);

/** Teinte de l'affiche typographique tirée du code pays : stable d'un build à l'autre. */
export function posterTone(iso: string): number {
  let h = 2;
  for (const c of iso) h = (h * 37 + c.charCodeAt(0)) % 9973;
  return h % 5;
}

export function fmtValue(v: string, lang: Lang): string {
  const s = String(v).trim();
  if (/^\d{4,}$/.test(s) || /^\d{1,3}([,.\s  ]\d{3})+$/.test(s)) {
    return Number(s.replace(/\D/g, "")).toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  }
  return s;
}

export function metaLine(f: Film, lang: Lang): string[] {
  const L = t(lang);
  return [f.year, langName(f.lang, lang), f.runtime ? `${f.runtime} ${L.min}` : "", f.animation ? L.animation : "", f.runtime && f.runtime < 60 ? L.short : ""].filter(Boolean) as string[];
}

export interface RatingChip { kind: "imdb" | "rt" | "tmdb"; label: string; value: string; votes?: number; href?: string }
export function ratingChips(f: Film, lang: Lang): RatingChip[] {
  if (!f.ratings) return [];
  const r = { imdb: solidRating(f.ratings.imdb), rt: f.ratings.rt, tmdb: solidRating(f.ratings.tmdb) };
  const out: RatingChip[] = [];
  if (r.imdb) out.push({ kind: "imdb", label: "IMDb", value: fmtRating(r.imdb.value, "imdb", lang), votes: r.imdb.votes, href: f.imdb_id ? `https://www.imdb.com/title/${f.imdb_id}/` : undefined });
  if (r.rt) out.push({ kind: "rt", label: "Rotten Tomatoes", value: fmtRating(r.rt.value, "rt", lang) });
  if (r.tmdb) out.push({ kind: "tmdb", label: "TMDB", value: fmtRating(r.tmdb.value, "tmdb", lang), votes: r.tmdb.votes, href: f.tmdb_id ? `https://www.themoviedb.org/movie/${f.tmdb_id}` : undefined });
  return out;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const availKinds = (f: Film): Kind[] => [hasFilm(f) && "film", f.book && "book", f.series && "series"].filter(Boolean) as Kind[];
export const withWorks = films.filter((f) => availKinds(f).length);
export const withBook = films.filter((f) => f.book);
export const withSeries = films.filter((f) => f.series);

export const bookCoverSrc = (b: Book) => (b.cover ? `${BASE}/${b.cover.replace(/^\//, "")}` : "");
export const seriesPosterSrc = (s: Series, size: string) => (s.poster ? `${IMG}${size}${s.poster}` : "");
export const bookAuthor = (b: Book, lang: Lang) => (lang === "fr" ? b.author : b.author_en) || b.author || b.author_en;

/** Tout ce qu'il faut pour dessiner la carte d'une œuvre, dans une langue. Sert au build et au navigateur. */
export interface CardData {
  kind: Kind; iso: string; country: string; title: string; sub: string; year: string; level: string;
  img: string; imgAlt: string; tone: number; layout: number; size: number; href: string; key: string;
}
const titleSize = (title: string) => {
  const len = [...title].length;
  const longest = Math.max(...title.split(/\s+/).map((w) => [...w].length));
  return Math.max(len <= 8 ? 1 : len <= 16 ? 2 : len <= 28 ? 3 : 4, longest > 10 ? 4 : longest > 7 ? 3 : longest > 5 ? 2 : 1);
};
export function cardData(f: Film, kind: Kind, lang: Lang): CardData | null {
  const L = t(lang);
  const base = { kind, iso: f.iso2, country: countryName(f.iso2, lang), href: href(lang, countrySlug(lang, f.iso2)), key: `${kind}:${f.iso2}` };
  if (kind === "film") {
    if (!hasFilm(f)) return null;
    const title = f.title;
    return { ...base, title: localTitle(f, lang), sub: "", year: f.year, level: f.level, img: posterSrc(f, "w342"), imgAlt: L.posterOf(title), tone: posterTone(f.iso2), layout: 0, size: titleSize(title) };
  }
  if (kind === "book") {
    const b = f.book;
    if (!b) return null;
    const title = workTitle(b, lang);
    const { tone, layout } = coverSeed(f.iso2, title);
    return { ...base, title, sub: bookAuthor(b, lang), year: b.year, level: b.level, img: bookCoverSrc(b), imgAlt: L.coverOf(title), tone, layout, size: titleSize(title) };
  }
  const s = f.series;
  if (!s) return null;
  const title = workTitle(s, lang);
  return { ...base, title, sub: "", year: s.year, level: s.level, img: seriesPosterSrc(s, "w342"), imgAlt: L.seriesPosterOf(title), tone: posterTone(f.iso2), layout: 0, size: titleSize(title) };
}

/** Un pays pour le navigateur : ses œuvres, déjà traduites. Sert à l'accueil, à la carte et aux rangées « ma liste ». */
export function clientIndex(lang: Lang) {
  return films.map((f) => ({
    iso: f.iso2, ccn3: f.ccn3, ll: f.latlng, name: countryName(f.iso2, lang), continent: f.continent,
    works: Object.fromEntries(availKinds(f).map((k) => [k, cardData(f, k, lang)!])) as Partial<Record<Kind, CardData>>,
  }));
}
export type ClientCountry = ReturnType<typeof clientIndex>[number];

/** Attributs du catalogue : ce que le filtre et le tri lisent sur la carte d'une œuvre. */
export function itemOf(f: Film, kind: Kind, lang: Lang): Item {
  const base = { kind, iso: f.iso2, country: countryName(f.iso2, lang), continent: f.continent };
  if (kind === "film") {
    return { ...base, title: f.title, alt: `${f.title_fr} ${f.title_en}`, year: yearNum(f), runtime: f.runtime || null, level: f.level, lang: f.lang, anim: f.animation, fr: watchableFr(f), imdb: solidRating(f.ratings?.imdb)?.value ?? null, rt: f.ratings?.rt?.value ?? null, pop: null };
  }
  const w = (kind === "book" ? f.book : f.series)!;
  const author = kind === "book" ? `${(w as Book).author} ${(w as Book).author_en}` : "";
  return {
    ...base, title: workTitle(w, lang), alt: `${w.orig} ${w.fr} ${w.en} ${author}`, year: yearOf(w.year), runtime: null, level: w.level,
    lang: kind === "series" ? (w as Series).lang : "", anim: false, fr: false, imdb: null, rt: null,
    pop: kind === "book" ? (w as Book).links : (w as Series).votes,
  };
}

/** Les films du site au format de la liste Letterboxd (voir letterboxdCsv). */
export function lbFilms(lang: Lang): LbFilm[] {
  return withFilm.map((f) => ({ iso: f.iso2, country: countryName(f.iso2, lang), title: f.title, year: yearOf(f.year),
    tmdb: f.tmdb_id, imdb: f.imdb_id, level: f.level }));
}
