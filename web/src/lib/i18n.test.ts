import { describe, expect, it } from "vitest";
import { STRINGS, visaText, figureText } from "./i18n";

const walk = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === "string") out.push(v);
  else if (v && typeof v === "object") Object.values(v).forEach((x) => walk(x, out));
  return out;
};

describe("textes", () => {
  it("n'ont aucun tiret cadratin, dans les deux langues", () => {
    for (const lang of ["fr", "en"] as const) {
      expect(walk(STRINGS[lang]).filter((s) => s.includes("—"))).toEqual([]);
    }
  });
});

describe("visaText", () => {
  const kinds = ["film", "book", "series"] as const;
  it("donne un titre et une phrase pour chaque type et chaque niveau", () => {
    for (const lang of ["fr", "en"] as const) {
      for (const k of kinds) {
        for (const l of ["A", "B", "C", "D"]) {
          const v = visaText(k, l, "", lang);
          expect(v.title.length, `${lang} ${k} ${l}`).toBeGreaterThan(5);
          expect(v.long.length, `${lang} ${k} ${l}`).toBeGreaterThan(20);
        }
      }
    }
  });
  it("précise la phrase du niveau A selon la métrique", () => {
    const sales = visaText("book", "A", "sales", "fr").long;
    const canon = visaText("book", "A", "canon", "fr").long;
    expect(sales).not.toBe(canon);
    expect(visaText("series", "A", "ratings", "en").long).not.toBe(visaText("series", "A", "press", "en").long);
  });
  it("un film C qui n'est pas un choix de Films Around the World ne le cite pas", () => {
    for (const lang of ["fr", "en"] as const) {
      expect(visaText("film", "C", "editorial", lang).long).toMatch(/Films Around the World/);
      const own = visaText("film", "C", "press", lang);
      expect(own.long).not.toMatch(/Films Around the World/);
      expect(own.title).toBe(visaText("film", "C", "editorial", lang).title);
    }
  });
});

describe("figureText", () => {
  it("compte les articles et les votes, dans la langue de la page", () => {
    expect(figureText("book", "wikipedia", "151", "fr")).toBe("151 articles Wikipédia");
    expect(figureText("series", "tmdb_votes", "4710", "en")).toBe("4710 votes on TMDB");
  });
  it("garde la valeur libre telle quelle en français, avec « (in French) » en anglais", () => {
    expect(figureText("book", "sales", "plus de 5 millions d’exemplaires", "fr")).toBe("plus de 5 millions d’exemplaires");
    expect(figureText("book", "sales", "plus de 5 millions d’exemplaires", "en")).toBe("plus de 5 millions d’exemplaires (in French)");
  });
  it("ne montre rien sans valeur", () => expect(figureText("series", "ratings", "", "fr")).toBe(""));
});
