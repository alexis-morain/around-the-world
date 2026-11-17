/* Données du site au build : films.json produit par scripts/export_site.py. */
import data from "../data/films.json";
import { fmtRating, type Item, type Lang } from "./logic";
import { t } from "./i18n";

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
}
/** Le livre le plus lu du pays (scripts/books_series.py). links = articles Wikipédia. */
export interface Book { orig: string; fr: string; en: string; author: string; author_en: string; year: string; qid: string; links: number }
/** La série la plus vue du pays sur TMDB. */
export interface Series { orig: string; fr: string; en: string; year: string; tmdb_id: number; poster: string | null; votes: number; lang: string }

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
  const own = lang === "fr" ? f.overview_fr : f.overview_en;
  if (own) return { text: own, lang, fallback: false };
  const other: Lang = lang === "fr" ? "en" : "fr";
  const text = other === "fr" ? f.overview_fr : f.overview_en;
  return { text: text || "", lang: other, fallback: !!text };
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
  const r = f.ratings;
  if (!r) return [];
  const out: RatingChip[] = [];
  if (r.imdb) out.push({ kind: "imdb", label: "IMDb", value: fmtRating(r.imdb.value, "imdb", lang), votes: r.imdb.votes, href: f.imdb_id ? `https://www.imdb.com/title/${f.imdb_id}/` : undefined });
  if (r.rt) out.push({ kind: "rt", label: "Rotten Tomatoes", value: fmtRating(r.rt.value, "rt", lang) });
  if (r.tmdb) out.push({ kind: "tmdb", label: "TMDB", value: fmtRating(r.tmdb.value, "tmdb", lang), votes: r.tmdb.votes, href: f.tmdb_id ? `https://www.themoviedb.org/movie/${f.tmdb_id}` : undefined });
  return out;
}

/** Ce que le client reçoit pour la carte, le billboard et le catalogue (une langue à la fois). */
export function clientIndex(lang: Lang) {
  return films.map((f) => ({
    iso: f.iso2, ccn3: f.ccn3, ll: f.latlng, name: countryName(f.iso2, lang), lvl: f.level,
    title: hasFilm(f) ? f.title : "", local: hasFilm(f) ? localTitle(f, lang) : "", year: f.year,
    lang: f.lang,
    meta: hasFilm(f) ? metaLine(f, lang) : [],
    poster: posterSrc(f, "w342"), backdrop: backdropSrc(f), tone: posterTone(f.iso2),
    ov: hasFilm(f) ? overview(f, lang) : "",
    ovl: hasFilm(f) ? overviewIn(f, lang).lang : lang,
    ratings: hasFilm(f) ? ratingChips(f, lang).map(({ kind, label, value }) => ({ kind, label, value })) : [],
    trailer: f.trailer || "",
  }));
}
export type ClientFilm = ReturnType<typeof clientIndex>[number];

/** Attributs data-* d'une affiche, lus par le catalogue pour filtrer et trier. */
export function itemOf(f: Film, lang: Lang): Item {
  return {
    iso: f.iso2, country: countryName(f.iso2, lang), title: f.title, alt: `${f.title_fr} ${f.title_en}`,
    year: yearNum(f), runtime: f.runtime || null, level: f.level, continent: f.continent, lang: f.lang,
    anim: f.animation, fr: watchableFr(f), imdb: f.ratings?.imdb?.value ?? null, rt: f.ratings?.rt?.value ?? null,
  };
}
