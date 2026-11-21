import type { Kind, Lang } from "./logic";

export const REPO = "https://github.com/alexis-morain/around-the-world";

interface KindStrings { name: string; the: string; plural: string; none: string; seenBtn: string; seenTag: string }

const fr = {
  htmlTitle: "Around the World",
  brand: "Around the World",
  tagline: "Le tour du monde en œuvres",
  description: "Un film, un livre et une série par pays, ceux que le pays a le plus vus ou lus. Une carte, 199 pays, un voyage sans quitter le canapé.",
  skip: "Aller au contenu",
  nav: { home: "Accueil", catalogue: "Catalogue", method: "Méthode" },
  themeToLight: "Passer en mode clair",
  themeToDark: "Passer en mode sombre",
  otherLang: "English",
  otherLangShort: "EN",
  progress: (n: number, t: number) => `${n} sur ${t} œuvres`,
  daily: "Le pays du jour",
  drawn: "Tiré au sort",
  random: "Tirer un pays",
  more: "Ouvrir la fiche du pays",
  addList: "Ajouter à ma liste",
  inList: "Dans ma liste",
  seenOn: "Vu",
  trailer: "Bande-annonce",
  closeTrailer: "Fermer la bande-annonce",
  share: "Copier le lien",
  copied: "Lien copié",
  close: "Fermer",
  min: "min",
  animation: "animation",
  short: "court-métrage",
  kind: {
    film: { name: "Film", the: "Le film", plural: "Films", none: "Pas de film retenu pour ce pays", seenBtn: "Je l’ai vu", seenTag: "Vu" },
    book: { name: "Livre", the: "Le livre", plural: "Livres", none: "Pas de livre retenu pour ce pays", seenBtn: "Je l’ai lu", seenTag: "Lu" },
    series: { name: "Série", the: "La série", plural: "Séries", none: "Pas de série retenue pour ce pays", seenBtn: "Je l’ai vue", seenTag: "Vue" },
  } as Record<Kind, KindStrings>,
  noWork: { howLink: "Comment les œuvres sont choisies" },
  mapTitle: "Le monde, pays par pays",
  mapHint: "Cliquez un pays pour ouvrir sa fiche. La couleur suit ce que vous avez vu, lu ou regardé.",
  mapLabel: "Carte du monde : un film, un livre et une série par pays",
  mapLoading: "Chargement de la carte…",
  mapError: "La carte n’a pas pu se charger.",
  mapModes: "Colorer la carte selon",
  mapMode: { film: "Films", book: "Livres", series: "Séries", all: "Tout" } as Record<string, string>,
  mapKeyOpen: "À découvrir",
  mapKeySeen: "Terminé",
  mapKeySome: (n: number) => `${n} œuvre${n > 1 ? "s" : ""} sur 3`,
  mapKeyNone: { film: "Aucun film", book: "Aucun livre", series: "Aucune série", all: "Aucune œuvre" } as Record<string, string>,
  mapTipSeen: "vu",
  zoomIn: "Zoom avant", zoomOut: "Zoom arrière", reset: "Recentrer",
  trioLabel: "Les trois œuvres du pays",
  rows: {
    list: "Ma liste",
    seen: "Vos soirées passées",
    films: "Les films les mieux notés sur IMDb",
    books: "Les livres les plus cités sur Wikipédia",
    series: "Les séries les plus votées sur TMDB",
    france: "Films à voir en France sur abonnement",
  },
  rowAll: "Tout voir",
  prev: "Précédents", next: "Suivants",
  continents: { europe: "Europe", africa: "Afrique", middle_east: "Moyen-Orient", asia: "Asie", americas: "Amériques", oceania: "Océanie", other: "Ailleurs" } as Record<string, string>,
  seenStamp: "Déjà vu",
  seenStampLong: "Vous l’avez coché. Ça reste dans ce navigateur, rien n’est envoyé.",
  reliability: "Fiabilité du choix",
  why: "Pourquoi ce choix",
  runnerUp: "Juste derrière",
  lbBest: "Le mieux noté sur Letterboxd",
  story: "L’histoire",
  storyFallback: "Résumé en anglais : il n’en existe pas en français.",
  excerptWiki: "Extrait de Wikipédia (CC BY-SA)",
  where: "Où le voir en France",
  nowhere: "Pas de diffusion connue en France. Cherchez du côté des festivals, des cinémathèques ou de la plateforme du pays.",
  providerKinds: { flatrate: "Abonnement", free: "Gratuit", ads: "Gratuit avec pub", rent: "Location", buy: "Achat" } as Record<string, string>,
  links: "Ailleurs sur le web",
  linkSource: "Source du choix",
  linkWikipedia: "Wikipédia",
  linkWikidata: "Wikidata",
  linkOpenLibrary: "Open Library",
  coverBy: "Couverture :",
  alternatives: "Autres pistes",
  tmdbTop: "Le plus noté sur TMDB",
  fatw: "Choix de Films Around the World",
  video: "Phénomène vidéo",
  note: "Note d’arbitrage",
  countryProgress: (n: number, t: number) => (n === 0 ? `${t} œuvre${t > 1 ? "s" : ""} à découvrir` : `${n} sur ${t} vue${n > 1 ? "s" : ""}`),
  noFilmNote: "Aucun film de fiction national trouvé.",
  ratingsTitle: "Notes",
  votes: (n: string) => `${n} votes`,
  posterOf: (t: string) => `Affiche de ${t}`,
  coverOf: (t: string) => `Couverture de ${t}`,
  seriesPosterOf: (t: string) => `Affiche de la série ${t}`,
  posterBy: "Affiche :",
  sameRegion: (c: string) => `D’autres pays, ${c}`,
  tileWorks: (n: number) => `${n} œuvre${n > 1 ? "s" : ""}`,
  back: "Retour à l’accueil",
  catalogue: {
    title: "Tout le catalogue",
    lede: (f: number, b: number, s: number) => `${f} films, ${b} livres, ${s} séries. Trois onglets, les mêmes filtres, et le choix de chaque pays expliqué sur sa fiche.`,
    tabs: "Type d’œuvre",
    search: "Pays ou titre",
    sort: "Trier par",
    sorts: {
      film: { country: "Pays, de A à Z", imdb: "Note IMDb", rt: "Rotten Tomatoes", new: "Plus récents", old: "Plus anciens", runtime: "Plus courts" },
      book: { country: "Pays, de A à Z", pop: "Les plus cités sur Wikipédia", new: "Plus récents", old: "Plus anciens" },
      series: { country: "Pays, de A à Z", pop: "Les plus votées sur TMDB", new: "Plus récentes", old: "Plus anciennes" },
    } as Record<Kind, Record<string, string>>,
    anyContinent: "Tous les continents",
    anyDecade: "Toutes les décennies",
    anyDuration: "Toutes les durées",
    durations: { short: "Moins de 90 min", mid: "90 à 120 min", long: "Plus de 2 h" } as Record<string, string>,
    anyLang: "Toutes les langues",
    anyLevel: "Toute fiabilité",
    levelShort: { A: "Source chiffrée", B: "Signal solide", C: "Signal faible", D: "Dernier recours" } as Record<string, string>,
    fr: "Visible en France",
    anim: "Animation",
    unseen: "À découvrir",
    list: "Ma liste",
    reset: "Tout effacer",
    count: {
      film: ["Aucun film ne correspond.", "1 film", "{n} films"],
      book: ["Aucun livre ne correspond.", "1 livre", "{n} livres"],
      series: ["Aucune série ne correspond.", "1 série", "{n} séries"],
    } as Record<Kind, [string, string, string]>,
    filters: "Filtres",
  },
  methodTitle: "Comment les œuvres ont été choisies",
  tmdbNotice: "Ce site utilise l’API TMDB sans être approuvé ni certifié par TMDB.",
  ratingsNotice: "Notes IMDb et Rotten Tomatoes relevées à la mise à jour, elles bougent avec le temps.",
  updated: (d: string) => `Mise à jour : ${d}.`,
};

type Strings = typeof fr;

const en: Strings = {
  htmlTitle: "Around the World",
  brand: "Around the World",
  tagline: "Around the World in Stories",
  description: "One film, one book and one series for every country, the ones the country watched or read the most. One map, 199 countries, a trip without leaving the couch.",
  skip: "Skip to content",
  nav: { home: "Home", catalogue: "Catalogue", method: "Method" },
  themeToLight: "Switch to light mode",
  themeToDark: "Switch to dark mode",
  otherLang: "Français",
  otherLangShort: "FR",
  progress: (n, t) => `${n} of ${t} works`,
  daily: "Country of the day",
  drawn: "Drawn at random",
  random: "Draw a country",
  more: "Open the country page",
  addList: "Add to my list",
  inList: "In my list",
  seenOn: "Seen",
  trailer: "Trailer",
  closeTrailer: "Close the trailer",
  share: "Copy link",
  copied: "Link copied",
  close: "Close",
  min: "min",
  animation: "animation",
  short: "short film",
  kind: {
    film: { name: "Film", the: "The film", plural: "Films", none: "No film picked for this country", seenBtn: "I’ve watched it", seenTag: "Seen" },
    book: { name: "Book", the: "The book", plural: "Books", none: "No book picked for this country", seenBtn: "I’ve read it", seenTag: "Read" },
    series: { name: "Series", the: "The series", plural: "Series", none: "No series picked for this country", seenBtn: "I’ve watched it", seenTag: "Seen" },
  },
  noWork: { howLink: "How the works are picked" },
  mapTitle: "The world, country by country",
  mapHint: "Click a country to open its page. The colour follows what you have watched or read.",
  mapLabel: "World map: one film, one book and one series per country",
  mapLoading: "Loading the map…",
  mapError: "The map could not load.",
  mapModes: "Colour the map by",
  mapMode: { film: "Films", book: "Books", series: "Series", all: "All" },
  mapKeyOpen: "To discover",
  mapKeySeen: "Done",
  mapKeySome: (n) => `${n} of 3 works`,
  mapKeyNone: { film: "No film", book: "No book", series: "No series", all: "No work" },
  mapTipSeen: "done",
  zoomIn: "Zoom in", zoomOut: "Zoom out", reset: "Reset",
  trioLabel: "The country’s three works",
  rows: {
    list: "My list",
    seen: "Your past nights",
    films: "Highest rated films on IMDb",
    books: "Most cited books on Wikipedia",
    series: "Most voted series on TMDB",
    france: "Films streaming in France",
  },
  rowAll: "See all",
  prev: "Previous", next: "Next",
  continents: { europe: "Europe", africa: "Africa", middle_east: "Middle East", asia: "Asia", americas: "Americas", oceania: "Oceania", other: "Elsewhere" },
  seenStamp: "Already done",
  seenStampLong: "You ticked it. This stays in this browser, nothing is sent.",
  reliability: "How reliable this pick is",
  why: "Why this pick",
  runnerUp: "Runner-up",
  lbBest: "Best rated on Letterboxd",
  story: "The story",
  storyFallback: "Summary in French: there is none in English.",
  excerptWiki: "Excerpt from Wikipedia (CC BY-SA)",
  where: "Where to watch in France",
  nowhere: "No known release in France. Try festivals, film archives or the country’s own platforms.",
  providerKinds: { flatrate: "Subscription", free: "Free", ads: "Free with ads", rent: "Rent", buy: "Buy" },
  links: "Elsewhere on the web",
  linkSource: "Source of the pick",
  linkWikipedia: "Wikipedia",
  linkWikidata: "Wikidata",
  linkOpenLibrary: "Open Library",
  coverBy: "Cover:",
  alternatives: "Other leads",
  tmdbTop: "Most rated on TMDB",
  fatw: "Films Around the World pick",
  video: "Video phenomenon",
  note: "Editor’s note (in French)",
  countryProgress: (n, t) => (n === 0 ? `${t} work${t > 1 ? "s" : ""} to discover` : `${n} of ${t} done`),
  noFilmNote: "No national fiction film found.",
  ratingsTitle: "Ratings",
  votes: (n) => `${n} votes`,
  posterOf: (t) => `Poster for ${t}`,
  coverOf: (t) => `Cover of ${t}`,
  seriesPosterOf: (t) => `Poster for the series ${t}`,
  posterBy: "Poster:",
  sameRegion: (c) => `More countries, ${c}`,
  tileWorks: (n) => `${n} work${n > 1 ? "s" : ""}`,
  back: "Back to home",
  catalogue: {
    title: "The whole catalogue",
    lede: (f, b, s) => `${f} films, ${b} books, ${s} series. Three tabs, the same filters, and each country’s pick explained on its page.`,
    tabs: "Type of work",
    search: "Country or title",
    sort: "Sort by",
    sorts: {
      film: { country: "Country, A to Z", imdb: "IMDb rating", rt: "Rotten Tomatoes", new: "Newest", old: "Oldest", runtime: "Shortest" },
      book: { country: "Country, A to Z", pop: "Most cited on Wikipedia", new: "Newest", old: "Oldest" },
      series: { country: "Country, A to Z", pop: "Most voted on TMDB", new: "Newest", old: "Oldest" },
    },
    anyContinent: "All continents",
    anyDecade: "All decades",
    anyDuration: "Any length",
    durations: { short: "Under 90 min", mid: "90 to 120 min", long: "Over 2 h" },
    anyLang: "All languages",
    anyLevel: "Any reliability",
    levelShort: { A: "Sourced figure", B: "Solid signal", C: "Weak signal", D: "Last resort" },
    fr: "Streaming in France",
    anim: "Animation",
    unseen: "Not done yet",
    list: "My list",
    reset: "Clear all",
    count: {
      film: ["No film matches.", "1 film", "{n} films"],
      book: ["No book matches.", "1 book", "{n} books"],
      series: ["No series matches.", "1 series", "{n} series"],
    },
    filters: "Filters",
  },
  methodTitle: "How the works were picked",
  tmdbNotice: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
  ratingsNotice: "IMDb and Rotten Tomatoes ratings were read at the last update and drift over time.",
  updated: (d) => `Updated ${d}.`,
};

export const STRINGS: Record<Lang, Strings> = { fr, en };
export const t = (lang: Lang) => STRINGS[lang];

/* ---------- Niveaux de fiabilité, propres à chaque type d'œuvre ---------- */

interface Level { title: string; long: string }
interface KindLevels { A: Level; B: Level; C: Level; D: Level; byMetric?: Record<string, string>; /** Film C choisi par le site, hors Films Around the World. */ ownC?: string }

const LEVELS: Record<Lang, Record<Kind, KindLevels>> = {
  fr: {
    film: {
      A: { title: "Box-office national sourcé", long: "Le film national qui a fait le plus d’entrées dans le pays, ou à défaut le plus de recettes. Sources : listes Wikipedia, instituts nationaux du cinéma, presse." },
      B: { title: "Pas de box-office : le film du pays le plus noté sur TMDB", long: "Aucun box-office publié. Le choix mesure la notoriété du film plus que son audience locale (50 votes TMDB minimum)." },
      C: { title: "Données rares : choix éditorial", long: "Trop peu de données : c’est le premier choix « native » de Films Around the World, une sélection éditoriale." },
      ownC: "Aucune donnée d’audience : choix éditorial du site, pour la raison donnée ci-dessous.",
      D: { title: "Dernier recours : très peu de votes", long: "Le film du pays le plus noté sur TMDB, avec moins de 50 votes. À prendre avec prudence." },
    },
    book: {
      A: { title: "Ventes, sondage ou classique scolaire, avec source", long: "Une source citée en fait le livre le plus lu du pays : ventes cumulées, sondage national ou programme scolaire." },
      B: { title: "Pas de chiffre : le plus présent sur Wikipédia", long: "Aucune vente ni aucun sondage trouvé. Le choix mesure la notoriété du livre dans le monde plus que sa lecture dans le pays (10 articles Wikipédia ou plus)." },
      C: { title: "Peu de données : choix fragile", long: "Moins de 10 articles Wikipédia : le livre est surtout connu sur place. À prendre avec prudence." },
      D: { title: "Choix manuel, sans signal", long: "Aucune donnée ne départage les livres du pays : c’est un choix éditorial." },
      byMetric: {
        sales: "Le livre le plus vendu du pays, d’après une source citée.",
        survey: "Arrivé en tête d’un sondage national sur les livres les plus lus ou préférés, source citée.",
        canon: "Classique du programme scolaire national, d’après une source citée.",
      },
    },
    series: {
      A: { title: "Audience mesurée ou source explicite", long: "Une source citée en fait la série la plus regardée du pays : audience mesurée, classement d’une plateforme ou presse." },
      B: { title: "Pas d’audience : la plus votée sur TMDB", long: "Aucune audience publiée. Le choix mesure la notoriété de la série plus que son audience locale (50 votes TMDB minimum)." },
      C: { title: "Peu de votes : choix fragile", long: "Moins de 50 votes sur TMDB : la série est surtout connue sur place. À prendre avec prudence." },
      D: { title: "Choix manuel, sans signal", long: "Aucune donnée ne départage les séries du pays : c’est un choix éditorial." },
      byMetric: {
        ratings: "Record ou moyenne d’audience mesurée dans le pays (Médiamétrie, Nielsen, BARB et leurs équivalents).",
        streaming: "Première du classement d’une plateforme nationale, d’après une source citée.",
        press: "La presse la présente comme la série la plus regardée du pays, source citée.",
      },
    },
  },
  en: {
    film: {
      A: { title: "Sourced national box office", long: "The national film with the most admissions in the country, or failing that the highest gross. Sources: Wikipedia lists, national film institutes, press." },
      B: { title: "No box office data: the country’s most-rated film on TMDB", long: "No published box office. The pick measures the film’s reputation more than its local audience (50 TMDB votes minimum)." },
      C: { title: "Little data: editorial pick", long: "Too little data: this is the first “native voice” pick of Films Around the World, an editorial selection." },
      ownC: "No audience data at all: an editorial pick by this site, for the reason given below.",
      D: { title: "Last resort: very few votes", long: "The country’s most-rated film on TMDB, with fewer than 50 votes. Take it with care." },
    },
    book: {
      A: { title: "Sales, survey or school classic, with a source", long: "A cited source makes it the country’s most-read book: cumulative sales, a national survey or the school curriculum." },
      B: { title: "No figure: the most present on Wikipedia", long: "No sales or survey found. The pick measures the book’s fame in the world more than its readership at home (10 Wikipedia articles or more)." },
      C: { title: "Little data: tentative pick", long: "Fewer than 10 Wikipedia articles: the book is mostly known at home. Take it with care." },
      D: { title: "Manual pick, no signal", long: "No data tells the country’s books apart: this is an editorial choice." },
      byMetric: {
        sales: "The country’s best-selling book, according to a cited source.",
        survey: "Came first in a national survey of the most-read or favourite books, source cited.",
        canon: "A classic of the national school curriculum, according to a cited source.",
      },
    },
    series: {
      A: { title: "Measured audience or explicit source", long: "A cited source makes it the country’s most-watched series: measured audience, a platform ranking or the press." },
      B: { title: "No audience data: the most voted on TMDB", long: "No published audience. The pick measures the series’ fame more than its local audience (50 TMDB votes minimum)." },
      C: { title: "Few votes: tentative pick", long: "Fewer than 50 votes on TMDB: the series is mostly known at home. Take it with care." },
      D: { title: "Manual pick, no signal", long: "No data tells the country’s series apart: this is an editorial choice." },
      byMetric: {
        ratings: "Record or average audience measured in the country (Médiamétrie, Nielsen, BARB and their equivalents).",
        streaming: "First in a national platform’s ranking, according to a cited source.",
        press: "The press presents it as the country’s most-watched series, source cited.",
      },
    },
  },
};

/** Titre et phrase du tampon de niveau, selon le type d'œuvre et, au niveau A, la métrique sourcée. */
export function visaText(kind: Kind, level: string, metric: string, lang: Lang): Level {
  const k = LEVELS[lang][kind];
  const l = (k as unknown as Record<string, Level>)[level] ?? k.D;
  const long = level === "A" && k.byMetric?.[metric] ? k.byMetric[metric]
    : level === "C" && k.ownC && metric && metric !== "editorial" ? k.ownC : l.long;
  return { title: l.title, long };
}

/** La mesure du choix, en une ligne : « 20 489 303 entrées en salle », « 151 articles Wikipédia », ou la source citée telle quelle. */
export function figureText(kind: Kind, metric: string, value: string, lang: Lang): string {
  const v = String(value ?? "").trim();
  if (!v && kind !== "film") return "";
  const fr = lang === "fr";
  if (kind === "film") {
    const f: Record<string, string> = fr
      ? { admissions: `${v} entrées en salle`, gross: `${v} de recettes nationales`, votes: `${v} votes sur TMDB`, editorial: "Choix « native » de Films Around the World", press: v }
      : { admissions: `${v} cinema admissions`, gross: `${v} national box office`, votes: `${v} votes on TMDB`, editorial: "“Native voice” pick by Films Around the World", press: "Record reported by the national press" };
    return f[metric] ?? "";
  }
  if (kind === "book" && metric === "wikipedia") return fr ? `${v} articles Wikipédia` : `${v} Wikipedia articles`;
  if (kind === "series" && metric === "tmdb_votes") return fr ? `${v} votes sur TMDB` : `${v} votes on TMDB`;
  // valeur libre en français (ventes, audience…) : telle quelle, avec la mention de langue sur la fiche anglaise
  return fr ? v : `${v} (in French)`;
}

/** Préfixe d'URL d'une langue, base du site comprise. */
export function href(lang: Lang, path = ""): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const p = path.replace(/^\//, "");
  return `${base}/${lang === "en" ? "en/" : ""}${p}`;
}
