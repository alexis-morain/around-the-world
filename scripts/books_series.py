"""Livre et série de chaque pays : assemble data/livres_series.json.

Entrée : data/raw/books_series_raw.json (candidats par pays, produits par
lab/2026-11-16-autres-domaines/run_all.py), et data/overrides_livres_series.json
(arbitrages manuels, chacun avec sa note).

Critères :
- livre : œuvre littéraire d'un auteur du pays, dans une langue du pays, avec le
  plus d'articles Wikipédia (sitelinks Wikidata) ;
- série : série TMDB dont le pays cité en premier est le pays, la plus votée
  (hors info, téléréalité, talk-shows).

Ajoute les titres et noms d'auteur en anglais (Wikidata via QLever, TMDB).
"""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "books_series_raw.json"
OVERRIDES = ROOT / "data" / "overrides_livres_series.json"
OUT = ROOT / "data" / "livres_series.json"
UA = {"User-Agent": "one-film-per-country-research/0.1"}
QLEVER = "https://qlever.dev/api/wikidata"
MIN_VOTES = 3  # sous ce seuil, une série TMDB n'est pas un signal : pas de série
PFX = """PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
"""


def tmdb_key():
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith("TMDB_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("TMDB_API_KEY absent de .env")


def get(url, params=None, headers=None):
    full = url + ("?" + urllib.parse.urlencode(params) if params else "")
    err = None
    for attempt in range(5):
        try:
            req = urllib.request.Request(full, headers={**UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=150) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(2 ** attempt)
    raise RuntimeError(f"échec {url} : {err}")


def sparql(q):
    data = get(QLEVER, {"query": PFX + q}, {"Accept": "application/sparql-results+json"})
    return [{k: v["value"] for k, v in b.items()} for b in data["results"]["bindings"]]


def qid(uri):
    return uri.rsplit("/", 1)[-1]


def work_labels(qids):
    """qid -> titres fr/en/original, auteurs fr/en, année, nombre d'articles Wikipédia."""
    out = {}
    qids = sorted(qids)
    for i in range(0, len(qids), 60):
        values = " ".join(f"wd:{q}" for q in qids[i:i + 60])
        rows = sparql(f"""
SELECT ?w (SAMPLE(?tf) AS ?fr) (SAMPLE(?te) AS ?en) (SAMPLE(?to) AS ?orig) (MIN(?d) AS ?date)
       (MAX(?sl) AS ?links)
       (GROUP_CONCAT(DISTINCT ?af; separator=", ") AS ?author_fr)
       (GROUP_CONCAT(DISTINCT ?ae; separator=", ") AS ?author_en)
WHERE {{
  VALUES ?w {{ {values} }}
  ?w wikibase:sitelinks ?sl .
  OPTIONAL {{ ?w rdfs:label ?tf FILTER(LANG(?tf)="fr") }}
  OPTIONAL {{ ?w rdfs:label ?te FILTER(LANG(?te)="en") }}
  OPTIONAL {{ ?w wdt:P1476 ?to }}
  OPTIONAL {{ ?w wdt:P577 ?d }}
  OPTIONAL {{ ?w wdt:P50 ?a . OPTIONAL {{ ?a rdfs:label ?af FILTER(LANG(?af)="fr") }}
              OPTIONAL {{ ?a rdfs:label ?ae FILTER(LANG(?ae)="en") }} }}
}} GROUP BY ?w""")
        for r in rows:
            out[qid(r["w"])] = r
    return out


def series_en(tmdb_id, key):
    d = get(f"https://api.themoviedb.org/3/tv/{tmdb_id}", {"api_key": key, "language": "en-US"})
    return d.get("name") or ""


def book_entry(qid_, lab):
    """None si l'œuvre n'a de titre dans aucune langue lisible."""
    r = lab.get(qid_, {})
    fr, en = r.get("fr", ""), r.get("en", "")
    if not (fr or en or r.get("orig")):
        return None
    return {"orig": r.get("orig", ""), "fr": fr, "en": en,
            "author": r.get("author_fr") or r.get("author_en") or "",
            "author_en": r.get("author_en") or r.get("author_fr") or "",
            "year": (r.get("date") or "")[:4], "qid": qid_, "links": int(r.get("links") or 0)}


def main():
    raw = json.loads(RAW.read_text())
    overrides = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}
    key = tmdb_key()

    picks = {}
    for iso, e in raw.items():
        o = overrides.get(iso, {})
        b = (e.get("livre") or {}).get("pick")
        s = (e.get("serie") or {}).get("pick")
        book_q = o["book"] if "book" in o else (b or {}).get("wikidata")
        if s and s["votes"] < MIN_VOTES:
            s = None
        series_id = o["series"] if "series" in o else (s or {}).get("tmdb_id")
        picks[iso] = (book_q, series_id, s if s and s.get("tmdb_id") == series_id else None)

    lab = work_labels({b for b, _, _ in picks.values() if b})
    out = {}
    for iso, (book_q, series_id, s) in sorted(picks.items()):
        entry = {"book": book_entry(book_q, lab) if book_q else None, "series": None,
                 "note": overrides.get(iso, {}).get("note", "")}
        if entry["book"] and overrides.get(iso, {}).get("book_en"):
            entry["book"]["en"] = overrides[iso]["book_en"]
        if series_id:
            if s is None:  # série forcée par arbitrage : on va chercher sa fiche
                d = get(f"https://api.themoviedb.org/3/tv/{series_id}", {"api_key": key, "language": "fr-FR"})
                s = {"name_fr": d["name"], "original_name": d["original_name"],
                     "year": (d.get("first_air_date") or "")[:4], "votes": d["vote_count"],
                     "lang": d["original_language"], "poster": d.get("poster_path")}
            entry["series"] = {"orig": s["original_name"], "fr": s["name_fr"],
                               "en": series_en(series_id, key), "year": s.get("year") or "",
                               "tmdb_id": series_id, "poster": s.get("poster"),
                               "votes": s["votes"], "lang": s["lang"]}
        out[iso] = entry
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    n_b = sum(1 for e in out.values() if e["book"])
    n_s = sum(1 for e in out.values() if e["series"])
    print(f"{len(out)} pays, {n_b} livres, {n_s} séries -> {OUT}")


if __name__ == "__main__":
    main()
