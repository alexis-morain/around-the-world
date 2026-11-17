import { describe, expect, it } from "vitest";
import { dayNumber, pickDaily, parseIdSet, matches, sortItems, fmtRating, runtimeBucket, titleLen, type Item, type Filters } from "./logic";

const item = (o: Partial<Item>): Item => ({
  iso: "XX", country: "Xland", title: "Film", alt: "", year: 2000, runtime: 100, level: "A",
  continent: "europe", lang: "fr", anim: false, fr: false, imdb: null, rt: null, ...o,
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
  const ctx = { seen: new Set(["JP"]), list: new Set(["IT"]) };
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

import { workTitle, wikiUrl, isThin } from "./logic";

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
