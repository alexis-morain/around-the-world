import { describe, expect, it } from "vitest";
import { focusBox, dayNumber, pickDaily, parseIdSet, matches, sortItems, fmtRating, runtimeBucket, titleLen, type Item, type Filters } from "./logic";

const item = (o: Partial<Item>): Item => ({
  kind: "film", iso: "XX", country: "Xland", title: "Film", alt: "", year: 2000, runtime: 100, level: "A",
  continent: "europe", lang: "fr", anim: false, fr: false, imdb: null, rt: null, pop: null, ...o,
});
const all: Filters = { q: "", continent: "", level: "", decade: "", duration: "", lang: "", fr: false, anim: false, unseen: false, list: false };

describe("dayNumber", () => {
  it("change à minuit, pas en cours de journée", () => {
    expect(dayNumber(new Date(2026, 10, 15, 0, 5))).toBe(dayNumber(new Date(2026, 10, 15, 23, 55)));
    expect(dayNumber(new Date(2026, 10, 16, 0, 1))).toBe(dayNumber(new Date(2026, 10, 15, 12)) + 1);
  });
});

describe("pickDaily", () => {
  const pool = ["AA", "BB", "CC", "DD"];
  it("donne le même film toute la journée", () => {
    const d = new Date(2026, 10, 15, 9);
    expect(pickDaily(pool, new Set(), d)).toBe(pickDaily(pool, new Set(), new Date(2026, 10, 15, 22)));
  });
  it("saute les films déjà vus", () => {
    const d = new Date(2026, 10, 15);
    const first = pickDaily(pool, new Set(), d)!;
    expect(pickDaily(pool, new Set([first]), d)).not.toBe(first);
  });
  it("retombe sur le film du jour quand tout est vu", () => {
    const d = new Date(2026, 10, 15);
    expect(pickDaily(pool, new Set(pool), d)).toBe(pickDaily(pool, new Set(), d));
  });
  it("renvoie null sans film", () => {
    expect(pickDaily([], new Set(), new Date())).toBeNull();
  });
});

describe("parseIdSet", () => {
  it("lit un tableau de codes", () => expect([...parseIdSet('["FR","JP"]')]).toEqual(["FR", "JP"]));
  it("ignore le stockage corrompu", () => {
    expect(parseIdSet("{oups").size).toBe(0);
    expect(parseIdSet(null).size).toBe(0);
    expect([...parseIdSet('["FR", 3, null]')]).toEqual(["FR"]);
  });
});

describe("matches", () => {
  const ctx = { seen: new Set(["film:JP"]), list: new Set(["film:IT"]) };
  it("cherche dans le pays, le titre et le titre traduit, sans accents ni casse", () => {
    const f = item({ country: "Égypte", title: "Al-Lemby", alt: "El Limby" });
    expect(matches(f, { ...all, q: "egypte" }, ctx)).toBe(true);
    expect(matches(f, { ...all, q: "LIMBY" }, ctx)).toBe(true);
    expect(matches(f, { ...all, q: "japon" }, ctx)).toBe(false);
  });
  it("filtre par décennie et par durée", () => {
    const f = item({ year: 1966, runtime: 85 });
    expect(matches(f, { ...all, decade: "1960" }, ctx)).toBe(true);
    expect(matches(f, { ...all, decade: "1970" }, ctx)).toBe(false);
    expect(matches(f, { ...all, duration: "short" }, ctx)).toBe(true);
    expect(matches(f, { ...all, duration: "long" }, ctx)).toBe(false);
  });
  it("filtre les vus et la liste", () => {
    expect(matches(item({ iso: "JP" }), { ...all, unseen: true }, ctx)).toBe(false);
    expect(matches(item({ iso: "IT" }), { ...all, list: true }, ctx)).toBe(true);
    expect(matches(item({ iso: "FR" }), { ...all, list: true }, ctx)).toBe(false);
  });
  it("filtre par niveau, continent, langue, France, animation", () => {
    const f = item({ level: "B", continent: "asia", lang: "ja", fr: true, anim: true });
    expect(matches(f, { ...all, level: "B", continent: "asia", lang: "ja", fr: true, anim: true }, ctx)).toBe(true);
    expect(matches(f, { ...all, level: "A" }, ctx)).toBe(false);
    expect(matches(item({ fr: false }), { ...all, fr: true }, ctx)).toBe(false);
  });
});

describe("runtimeBucket", () => {
  it("range les durées", () => {
    expect(runtimeBucket(89)).toBe("short");
    expect(runtimeBucket(90)).toBe("mid");
    expect(runtimeBucket(120)).toBe("mid");
    expect(runtimeBucket(121)).toBe("long");
    expect(runtimeBucket(null)).toBe("");
  });
});

describe("sortItems", () => {
  const a = item({ iso: "A", country: "Zambie", imdb: 6.1, rt: null, year: 1990, runtime: 80 });
  const b = item({ iso: "B", country: "Allemagne", imdb: 7.9, rt: 90, year: 2010, runtime: 140 });
  const c = item({ iso: "C", country: "Égypte", imdb: null, rt: 70, year: null, runtime: null });
  const ids = (l: Item[]) => l.map((x) => x.iso);
  it("trie par pays avec la collation de la langue", () => expect(ids(sortItems([a, b, c], "country", "fr"))).toEqual(["B", "C", "A"]));
  it("trie par note IMDb, sans note en dernier", () => expect(ids(sortItems([a, b, c], "imdb", "fr"))).toEqual(["B", "A", "C"]));
  it("trie par Rotten Tomatoes", () => expect(ids(sortItems([a, b, c], "rt", "fr"))).toEqual(["B", "C", "A"]));
  it("trie par année, récents d'abord, sans année en dernier", () => expect(ids(sortItems([a, b, c], "new", "fr"))).toEqual(["B", "A", "C"]));
  it("trie par année, anciens d'abord", () => expect(ids(sortItems([a, b, c], "old", "fr"))).toEqual(["A", "B", "C"]));
  it("trie par durée, courts d'abord", () => expect(ids(sortItems([a, b, c], "runtime", "fr"))).toEqual(["A", "B", "C"]));
  it("ne modifie pas le tableau d'origine", () => {
    const l = [a, b, c];
    sortItems(l, "imdb", "fr");
    expect(ids(l)).toEqual(["A", "B", "C"]);
  });
});

describe("fmtRating", () => {
  it("formate selon la langue", () => {
    expect(fmtRating(7.3, "imdb", "fr")).toBe("7,3");
    expect(fmtRating(7, "tmdb", "en")).toBe("7.0");
    expect(fmtRating(96, "rt", "fr")).toBe("96 %");
    expect(fmtRating(96, "rt", "en")).toBe("96%");
  });
});

describe("titleLen", () => {
  it("garde la grande taille pour un titre court", () => expect(titleLen("Soy Cuba")).toBe("s"));
  it("réduit un titre moyen", () => expect(titleLen("La Bataille d'Alger, édition")).toBe("m"));
  it("réduit fort un titre long", () => expect(titleLen("Demon Slayer : Kimetsu no Yaiba - Le film : Le train de l'Infini")).toBe("l"));
  it("compte les caractères, pas les octets", () => expect(titleLen("劇場版「鬼滅の刃」無限列車編")).toBe("s"));
});

import { workTitle, wikiUrl, isThin, SORTS, workKey, loadTracking, mapState, completedCountries, countrySlug, legacySlug, yearOf, coverSeed, workLinks, nameLen, pickOverview, type Kind } from "./logic";

describe("workTitle", () => {
  const w = { orig: "Cien años de soledad", fr: "Cent ans de solitude", en: "One Hundred Years of Solitude" };
  it("donne le titre de la langue de la page", () => {
    expect(workTitle(w, "fr")).toBe("Cent ans de solitude");
    expect(workTitle(w, "en")).toBe("One Hundred Years of Solitude");
  });
  it("retombe sur l'original, puis sur l'autre langue", () => {
    expect(workTitle({ orig: "Dark", fr: "", en: "" }, "fr")).toBe("Dark");
    expect(workTitle({ orig: "", fr: "", en: "Solaris" }, "fr")).toBe("Solaris");
  });
});

describe("wikiUrl", () => {
  it("ouvre l'article Wikipédia de la langue de la page via Wikidata", () => {
    expect(wikiUrl("Q42", "fr")).toBe("https://www.wikidata.org/wiki/Special:GoToLinkedPage/frwiki/Q42");
    expect(wikiUrl("Q42", "en")).toBe("https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/Q42");
  });
});

describe("isThin", () => {
  it("signale un choix porté par peu de données", () => {
    expect(isThin("book", 4)).toBe(true);
    expect(isThin("book", 10)).toBe(false);
    expect(isThin("series", 30)).toBe(true);
    expect(isThin("series", 50)).toBe(false);
  });
});

import { byAuthor } from "./logic";

describe("byAuthor", () => {
  it("élide devant une voyelle en français, pas devant h", () => {
    expect(byAuthor("Ismaïl Kadaré", "fr")).toBe("d’Ismaïl Kadaré");
    expect(byAuthor("Émile Zola", "fr")).toBe("d’Émile Zola");
    expect(byAuthor("Hans Christian Andersen", "fr")).toBe("de Hans Christian Andersen");
    expect(byAuthor("Goethe", "fr")).toBe("de Goethe");
    expect(byAuthor("Goethe", "en")).toBe("by Goethe");
  });
});

describe("matches par type", () => {
  const ctx = { seen: new Set(["book:JP"]), list: new Set(["series:IT"]) };
  it("lit le suivi de la clé du type, pas celle des autres types", () => {
    expect(matches(item({ kind: "book", iso: "JP" }), { ...all, unseen: true }, ctx)).toBe(false);
    expect(matches(item({ kind: "film", iso: "JP" }), { ...all, unseen: true }, ctx)).toBe(true);
    expect(matches(item({ kind: "series", iso: "IT" }), { ...all, list: true }, ctx)).toBe(true);
    expect(matches(item({ kind: "book", iso: "IT" }), { ...all, list: true }, ctx)).toBe(false);
  });
  it("ignore les filtres propres aux films pour un livre ou une série", () => {
    const b = item({ kind: "book", runtime: null, fr: false, anim: false });
    expect(matches(b, { ...all, duration: "short", fr: true, anim: true }, ctx)).toBe(true);
    const f = item({ kind: "film", runtime: 200 });
    expect(matches(f, { ...all, duration: "short" }, ctx)).toBe(false);
  });
});

describe("sortItems par type", () => {
  const a = item({ kind: "book", iso: "A", country: "Zambie", pop: 12, year: 1950 });
  const b = item({ kind: "book", iso: "B", country: "Allemagne", pop: 300, year: 1800 });
  const c = item({ kind: "book", iso: "C", country: "Égypte", pop: null, year: null });
  const ids = (l: Item[]) => l.map((x) => x.iso);
  it("trie par popularité (articles ou votes), absents en dernier", () => expect(ids(sortItems([a, b, c], "pop", "fr"))).toEqual(["B", "A", "C"]));
  it("garde les tris année pour les livres", () => expect(ids(sortItems([a, b, c], "old", "fr"))).toEqual(["B", "A", "C"]));
});

describe("SORTS", () => {
  it("propose à chaque type ses tris, le pays en premier", () => {
    expect(SORTS.film).toEqual(["country", "imdb", "rt", "new", "old", "runtime"]);
    expect(SORTS.book).toEqual(["country", "pop", "new", "old"]);
    expect(SORTS.series).toEqual(["country", "pop", "new", "old"]);
  });
});

describe("workKey", () => {
  it("préfixe le code pays du type de l'œuvre", () => {
    expect(workKey("film", "FR")).toBe("film:FR");
    expect(workKey("book", "FR")).toBe("book:FR");
    expect(workKey("series", "FR")).toBe("series:FR");
  });
});

describe("loadTracking", () => {
  it("reprend une fois les anciens codes pays comme films", () => {
    expect([...loadTracking(null, '["FR","JP"]')]).toEqual(["film:FR", "film:JP"]);
  });
  it("ne touche pas aux clés déjà au nouveau format", () => {
    expect([...loadTracking(null, '["FR","book:JP"]')]).toEqual(["film:FR", "book:JP"]);
  });
  it("n'écrase pas le nouveau suivi par l'ancien", () => {
    expect([...loadTracking('["book:FR"]', '["FR","JP"]')]).toEqual(["book:FR"]);
  });
  it("un nouveau suivi vide reste vide, l'ancien est déjà repris", () => {
    expect(loadTracking("[]", '["FR"]').size).toBe(0);
  });
  it("ignore un ancien stockage corrompu", () => {
    expect(loadTracking(null, "{oups").size).toBe(0);
    expect(loadTracking(null, null).size).toBe(0);
  });
});

describe("mapState", () => {
  const seen = new Set(["film:FR", "book:FR", "series:JP"]);
  it("donne « aucune œuvre » quand le type manque dans le pays", () => {
    expect(mapState("series", ["film", "book"], "FR", seen).state).toBe("none");
    expect(mapState("all", [], "FR", seen).state).toBe("none");
  });
  it("suit le type choisi", () => {
    expect(mapState("film", ["film", "book"], "FR", seen)).toEqual({ state: "seen", seen: 1, of: 1 });
    expect(mapState("series", ["film", "series"], "FR", seen)).toEqual({ state: "open", seen: 0, of: 1 });
  });
  it("compte les œuvres vues sur celles du pays en mode Tout", () => {
    expect(mapState("all", ["film", "book", "series"], "FR", seen)).toEqual({ state: "seen", seen: 2, of: 3 });
    expect(mapState("all", ["film", "book", "series"], "JP", seen)).toEqual({ state: "seen", seen: 1, of: 3 });
    expect(mapState("all", ["film", "book"], "DE", seen)).toEqual({ state: "open", seen: 0, of: 2 });
  });
});

describe("completedCountries", () => {
  const avail = { FR: ["film", "book", "series"], CM: ["film", "book"], XX: [] } as Record<string, Kind[]>;
  it("garde les pays dont toutes les œuvres sont vues", () => {
    const done = completedCountries(avail, new Set(["film:CM", "book:CM", "film:FR"]));
    expect([...done]).toEqual(["CM"]);
  });
  it("ne compte jamais un pays sans œuvre", () => expect(completedCountries(avail, new Set()).has("XX")).toBe(false));
});

describe("countrySlug", () => {
  it("donne les chemins de la fiche pays dans chaque langue", () => {
    expect(countrySlug("fr", "FR")).toBe("pays/fr/");
    expect(countrySlug("en", "FR")).toBe("country/fr/");
  });
  it("garde le chemin de l'ancienne fiche film pour la redirection", () => {
    expect(legacySlug("fr", "CM")).toBe("film/cm/");
  });
});

describe("yearOf", () => {
  it("lit l'année en tête d'une chaîne, ou rien", () => {
    expect(yearOf("1943")).toBe(1943);
    expect(yearOf("2004-05-01")).toBe(2004);
    expect(yearOf("")).toBeNull();
    expect(yearOf("vers 1850")).toBeNull();
  });
});

describe("coverSeed", () => {
  it("est stable et reste dans les bornes", () => {
    expect(coverSeed("FR", "Le Petit Prince")).toEqual(coverSeed("FR", "Le Petit Prince"));
    for (const iso of ["FR", "CM", "JP", "AD"]) {
      const c = coverSeed(iso, "x");
      expect(c.tone).toBeGreaterThanOrEqual(0); expect(c.tone).toBeLessThan(6);
      expect(c.layout).toBeGreaterThanOrEqual(0); expect(c.layout).toBeLessThan(4);
    }
  });
  it("varie d'un pays à l'autre", () => {
    const seeds = new Set(["FR", "CM", "JP", "AD", "BR", "EG", "NO", "PE"].map((i) => JSON.stringify(coverSeed(i, "t"))));
    expect(seeds.size).toBeGreaterThan(3);
  });
});

describe("workLinks", () => {
  it("livre : Wikipédia via le qid, puis la source si elle diffère de Wikidata", () => {
    const l = workLinks("book", { qid: "Q1", source_url: "https://www.wikidata.org/wiki/Q1" }, "fr");
    expect(l.map((x) => x.id)).toEqual(["wikipedia"]);
    const m = workLinks("book", { qid: "Q1", source_url: "https://exemple.fr/ventes" }, "en");
    expect(m.map((x) => x.id)).toEqual(["wikipedia", "source"]);
    expect(m[0].url).toContain("enwiki/Q1");
  });
  it("livre absent de Wikidata : seulement la source", () => {
    expect(workLinks("book", { qid: "", source_url: "https://exemple.fr" }, "fr")).toEqual([{ id: "source", url: "https://exemple.fr" }]);
    expect(workLinks("book", { qid: "", source_url: "" }, "fr")).toEqual([]);
  });
  it("série : TMDB si l'id existe, sinon la source seule", () => {
    expect(workLinks("series", { tmdb_id: 7, source_url: "https://www.themoviedb.org/tv/7" }, "fr")).toEqual([{ id: "tmdb", url: "https://www.themoviedb.org/tv/7" }]);
    expect(workLinks("series", { tmdb_id: null, source_url: "https://presse.ke/x" }, "fr")).toEqual([{ id: "source", url: "https://presse.ke/x" }]);
  });
});

describe("nameLen", () => {
  it("réduit les noms de pays longs", () => {
    expect(nameLen("France")).toBe("s");
    expect(nameLen("Allemagne")).toBe("s");
    expect(nameLen("Afrique du Sud")).toBe("m");
    expect(nameLen("République démocratique du Congo")).toBe("l");
  });
});

describe("pickOverview", () => {
  it("donne le texte de la langue de la page", () => {
    expect(pickOverview("Bonjour", "Hello", "fr")).toEqual({ text: "Bonjour", lang: "fr", fallback: false });
    expect(pickOverview("Bonjour", "Hello", "en")).toEqual({ text: "Hello", lang: "en", fallback: false });
  });
  it("retombe sur l'autre langue avec la mention", () => {
    expect(pickOverview("", "Hello", "fr")).toEqual({ text: "Hello", lang: "en", fallback: true });
    expect(pickOverview("Bonjour", undefined, "en")).toEqual({ text: "Bonjour", lang: "fr", fallback: true });
  });
  it("ne donne rien si les deux manquent", () => {
    expect(pickOverview("", "", "fr")).toEqual({ text: "", lang: "fr", fallback: false });
    expect(pickOverview(undefined, undefined, "en").text).toBe("");
  });
});

describe("workLinks avec l'article Wikipédia", () => {
  it("préfère l'URL de l'article dans la langue de la page, sinon passe par Wikidata", () => {
    const w = { qid: "Q1", wiki_fr: "https://fr.wikipedia.org/wiki/A", wiki_en: "", source_url: "" };
    expect(workLinks("book", w, "fr")[0].url).toBe("https://fr.wikipedia.org/wiki/A");
    expect(workLinks("book", w, "en")[0].url).toContain("enwiki/Q1");
  });
  it("garde l'article même sans qid", () => {
    expect(workLinks("book", { qid: "", wiki_en: "https://en.wikipedia.org/wiki/B" }, "en").map((x) => x.id)).toEqual(["wikipedia"]);
  });
});

describe("focusBox", () => {
  const W = 1000;
  it("réunit les morceaux d'un pays ordinaire", () => {
    expect(focusBox([[100, 100, 120, 110], [130, 90, 140, 100]], W)).toEqual([100, 90, 140, 110]);
  });
  it("pays coupé par l'antiméridien : garde le côté le plus étendu (Fidji)", () => {
    // gros morceaux à droite, îlot à gauche
    expect(focusBox([[960, 500, 990, 520], [970, 530, 980, 540], [5, 505, 8, 508]], W)).toEqual([960, 500, 990, 540]);
  });
  it("ignore un îlot coupé en deux dont la boîte couvre toute la carte", () => {
    expect(focusBox([[960, 500, 990, 520], [5, 505, 8, 508], [4, 510, 995, 512]], W)).toEqual([960, 500, 990, 520]);
  });
  it("aucun morceau : null", () => {
    expect(focusBox([], W)).toBeNull();
  });
});
