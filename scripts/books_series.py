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
PREFIX schema: <http://schema.org/>
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


THRESHOLD = {"book": 10, "series": 50}  # au-dessus : signal fort (niveau B), sinon C


def auto_level(kind, n):
    """Niveau d'un choix automatique : B si le signal est fort, C sinon (A = source, après recherche)."""
    return "B" if n >= THRESHOLD[kind] else "C"


def resolve(auto_id, override, research, kind):
    """D'où vient le choix : recherche sourcée (A) > arbitrage manuel > automatique.

    Renvoie (origine, identifiant) ; identifiant = QID pour un livre, id TMDB pour une série.
    """
    field = "wikidata" if kind == "book" else "tmdb_id"
    if research and research.get("level") == "A" and (override or {}).get(f"{kind}_research", True):
        return "research", research.get(field) or None
    if override and kind in override:
        return "override", override[kind]
    return "auto", auto_id


def merge_research(passes):
    """Fusionne des passes de recherche, par pays et par type : un A plus récent remplace, un none n'efface rien."""
    out = {}
    for entries in passes:
        for e in entries:
            cur = out.setdefault(e["iso2"], {"iso2": e["iso2"]})
            for kind in ("book", "series"):
                new = e.get(kind)
                if not new:
                    continue
                if new.get("level") == "A" or (cur.get(kind) or {}).get("level") != "A":
                    cur[kind] = new
    return out


def load_research():
    """iso -> {book, series} des fichiers data/raw/bsA_*.json (1re passe), puis bsA2_*.json (2e passe)."""
    raw = ROOT / "data" / "raw"
    files = sorted(raw.glob("bsA_*.json")) + sorted(raw.glob("bsA2_*.json"))
    return merge_research(json.loads(f.read_text()) for f in files)


def find_qid(titles, author, langs=("en", "fr")):
    """QID Wikidata d'une œuvre : libellé exact dans une des langues, auteur par nom de famille."""
    surname = (author or "").split()[-1] if author else ""
    vals = " ".join(f"{json.dumps(t)}@{lg}" for t in titles if t for lg in dict.fromkeys(langs))
    if not vals:
        return None
    rows = sparql(f"""
SELECT ?w (MAX(?sl) AS ?n) WHERE {{
  VALUES ?lab {{ {vals} }}
  ?w rdfs:label ?lab ; wdt:P50 ?a ; wikibase:sitelinks ?sl .
  ?a rdfs:label ?an FILTER(CONTAINS(STR(?an), {json.dumps(surname)}))
}} GROUP BY ?w ORDER BY DESC(?n) LIMIT 1""")
    return qid(rows[0]["w"]) if rows else None


def book_entry(qid_, lab):
    """None si l'œuvre n'a de titre dans aucune langue lisible."""
    r = lab.get(qid_, {})
    fr, en = r.get("fr", ""), r.get("en", "")
    if not (fr or en or r.get("orig")):
        return None
    return {"orig": (r.get("orig") or "").rstrip(". "), "fr": fr, "en": en,
            "author": r.get("author_fr") or r.get("author_en") or "",
            "author_en": r.get("author_en") or r.get("author_fr") or "",
            "year": (r.get("date") or "")[:4], "qid": qid_, "links": int(r.get("links") or 0),
            "level": auto_level("book", int(r.get("links") or 0)), "metric": "wikipedia",
            "value": str(int(r.get("links") or 0)), "source_url": f"https://www.wikidata.org/wiki/{qid_}",
            "cover": None, "cover_credit": ""}


TMDB_CACHE_PATH = ROOT / "data" / "raw" / "bs_tmdb.json"
TMDB_CACHE = json.loads(TMDB_CACHE_PATH.read_text()) if TMDB_CACHE_PATH.exists() else {}


def tmdb_get(series_id, key, lang):
    """Fiche TMDB d'une série, gardée en cache (supprimer bs_tmdb.json pour rafraîchir)."""
    k = f"{series_id}:{lang}"
    if k not in TMDB_CACHE:
        TMDB_CACHE[k] = get(f"https://api.themoviedb.org/3/tv/{series_id}", {"api_key": key, "language": lang})
        TMDB_CACHE_PATH.write_text(json.dumps(TMDB_CACHE, ensure_ascii=False))
    return TMDB_CACHE[k]


def tmdb_tv(series_id, key):
    d = tmdb_get(series_id, key, "fr-FR")
    return {"name_fr": d["name"], "original_name": d["original_name"],
            "year": (d.get("first_air_date") or "")[:4], "votes": d["vote_count"],
            "lang": d["original_language"], "poster": d.get("poster_path"),
            "overview_fr": d.get("overview") or ""}


def tmdb_tv_en(series_id, key):
    d = tmdb_get(series_id, key, "en-US")
    return d.get("name") or "", d.get("overview") or ""


def wiki_summaries(qids):
    """qid -> {fr, en} : début de l'article Wikipédia (cache data/raw/bs_summaries.json)."""
    path = ROOT / "data" / "raw" / "bs_summaries.json"
    cache = json.loads(path.read_text()) if path.exists() else {}
    todo = sorted(q for q in qids if q and q not in cache)
    for i in range(0, len(todo), 60):
        values = " ".join(f"wd:{q}" for q in todo[i:i + 60])
        rows = sparql(f"""
SELECT ?w ?site ?t WHERE {{
  VALUES ?w {{ {values} }}
  VALUES ?site {{ <https://fr.wikipedia.org/> <https://en.wikipedia.org/> }}
  ?a schema:about ?w ; schema:isPartOf ?site ; schema:name ?t .
}}""")
        titles = {}
        for r in rows:
            titles.setdefault(qid(r["w"]), {})["fr" if "fr." in r["site"] else "en"] = r["t"]
        for q in todo[i:i + 60]:
            cache[q] = {}
            for lg, t in titles.get(q, {}).items():
                d = None
                try:
                    d = get(f"https://{lg}.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(t.replace(" ", "_"), safe=""))
                except RuntimeError:
                    pass
                cache[q][lg] = {"text": (d or {}).get("extract") or "",
                                "url": ((d or {}).get("content_urls") or {}).get("desktop", {}).get("page", "")}
            path.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    return cache


def find_tmdb_tv(titles, year, key):
    """Id TMDB d'une série par titre, en préférant l'année de première diffusion."""
    for t in titles:
        if not t:
            continue
        res = get("https://api.themoviedb.org/3/search/tv", {"api_key": key, "query": t}).get("results") or []
        if year:
            same = [r for r in res if (r.get("first_air_date") or "")[:4] == str(year)]
            res = same or res
        if res:
            return res[0]["id"]
    return None


def sourced(r, kind):
    """Champs de fiabilité d'un choix sourcé par la recherche."""
    return {"level": "A", "metric": r.get("metric") or ("canon" if kind == "book" else "press"),
            "value": str(r.get("value") or ""), "source_url": r.get("source_url") or "",
            "research_note": r.get("note") or ""}


def main():
    raw = json.loads(RAW.read_text())
    overrides = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}
    research = load_research()
    ids_cache_path = ROOT / "data" / "raw" / "bs_ids.json"  # QID et id TMDB retrouvés pour la recherche
    ids = json.loads(ids_cache_path.read_text()) if ids_cache_path.exists() else {}
    key = tmdb_key()

    picks = {}
    for iso, e in raw.items():
        o = overrides.get(iso, {})
        r = research.get(iso, {})
        b = (e.get("livre") or {}).get("pick")
        s = (e.get("serie") or {}).get("pick")
        if s and s["votes"] < MIN_VOTES:
            s = None
        rb, rs = r.get("book") or {}, r.get("series") or {}
        b_from, book_q = resolve((b or {}).get("wikidata"), o, rb, "book")
        s_from, series_id = resolve((s or {}).get("tmdb_id"), o, rs, "series")
        if b_from == "research" and not book_q:
            k = f"book:{iso}"
            if k not in ids:
                ids[k] = find_qid([rb.get("title_original"), rb.get("title_en"), rb.get("title_fr")],
                                  rb.get("author"), (rb.get("language") or "en", "en", "fr"))
            book_q = ids[k]
        if s_from == "research" and not series_id:
            k = f"series:{iso}"
            if k not in ids:
                ids[k] = find_tmdb_tv([rs.get("title_original"), rs.get("title_en")], rs.get("year"), key)
            series_id = ids[k]
        ids_cache_path.write_text(json.dumps(ids, ensure_ascii=False, indent=1))
        picks[iso] = (b_from, book_q, rb, s_from, series_id, rs,
                      s if s and s.get("tmdb_id") == series_id else None)

    lab = work_labels({p[1] for p in picks.values() if p[1]})
    summaries = wiki_summaries({p[1] for p in picks.values() if p[1]})
    covers_path = ROOT / "data" / "covers.json"
    covers = json.loads(covers_path.read_text()) if covers_path.exists() else {}
    out = {}
    for iso, (b_from, book_q, rb, s_from, series_id, rs, s) in sorted(picks.items()):
        o = overrides.get(iso, {})
        book = book_entry(book_q, lab) if book_q else None
        if b_from == "research":
            if book is None:  # œuvre absente de Wikidata : on garde ce que dit la recherche
                book = {"orig": rb.get("title_original") or "", "fr": rb.get("title_fr") or "",
                        "en": rb.get("title_en") or "", "author": rb.get("author") or "",
                        "author_en": rb.get("author") or "", "year": str(rb.get("year") or ""),
                        "qid": "", "links": 0, "cover": None, "cover_credit": ""}
            book.update(sourced(rb, "book"))
            # libellés Wikidata parfois faux (titre anglais en guise de titre français)
            book["fr"] = rb.get("title_fr") or book["fr"]
            book["en"] = rb.get("title_en") or book["en"]
            # champs vides côté Wikidata : ceux de la recherche
            for f, rf in (("orig", "title_original"), ("author", "author"), ("author_en", "author"), ("year", "year")):
                if not book.get(f) and rb.get(rf):
                    book[f] = str(rb[rf])
        if book:
            if o.get("book_en"):
                book["en"] = o["book_en"]
            if o.get("book_orig"):
                book["orig"] = o["book_orig"]
            if o.get("book_level"):
                book["level"] = o["book_level"]
            sm = summaries.get(book["qid"], {}) if book["qid"] else {}
            book["overview_fr"] = (sm.get("fr") or {}).get("text", "")
            book["overview_en"] = (sm.get("en") or {}).get("text", "")
            book["wiki_fr"] = (sm.get("fr") or {}).get("url", "")
            book["wiki_en"] = (sm.get("en") or {}).get("url", "")
            c = covers.get(book["qid"]) if book["qid"] else None
            if c:
                book["cover"], book["cover_credit"] = c["file"], c["credit"]
        series = None
        if series_id:
            s = {**(s or {}), **tmdb_tv(series_id, key)}
            name_en, overview_en = tmdb_tv_en(series_id, key)
            series = {"orig": s["original_name"], "fr": s["name_fr"],
                      "en": name_en, "year": s.get("year") or "",
                      "overview_fr": s["overview_fr"], "overview_en": overview_en,
                      "tmdb_id": series_id, "poster": s.get("poster"),
                      "votes": s["votes"], "lang": s["lang"],
                      "level": auto_level("series", s["votes"]), "metric": "tmdb_votes",
                      "value": str(s["votes"]), "source_url": f"https://www.themoviedb.org/tv/{series_id}"}
        elif s_from == "research":  # série absente de TMDB
            series = {"orig": rs.get("title_original") or "", "fr": rs.get("title_fr") or "",
                      "en": rs.get("title_en") or "", "year": str(rs.get("year") or ""),
                      "tmdb_id": None, "poster": None, "votes": 0, "lang": rs.get("language") or ""}
        if series and s_from == "research":
            series.update(sourced(rs, "series"))
        if series and o.get("series_level"):
            series["level"] = o["series_level"]
        out[iso] = {"book": book, "series": series, "note": o.get("note", "")}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    n_b = sum(1 for e in out.values() if e["book"])
    n_s = sum(1 for e in out.values() if e["series"])
    print(f"{len(out)} pays, {n_b} livres, {n_s} séries -> {OUT}")


if __name__ == "__main__":
    main()
