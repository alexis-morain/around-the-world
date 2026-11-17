"""Couvertures des livres depuis Open Library -> web/public/covers/<qid>.jpg + data/covers.json.

Pour chaque livre de data/livres_series.json : recherche Open Library par titre
(original, français, anglais) et auteur, garde l'œuvre du bon auteur au titre
identique qui a le plus d'éditions, télécharge sa couverture. Le cache
data/covers.json (clé = QID Wikidata) évite de refaire les livres déjà vus ;
`python3 -I scripts/book_covers.py --retry` retente ceux restés sans couverture.
"""
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "data" / "livres_series.json"
CACHE = ROOT / "data" / "covers.json"
OUT_DIR = ROOT / "web" / "public" / "covers"
UA = {"User-Agent": "around-the-world-site/0.1 (personal project)"}


def norm(s):
    """Minuscules, sans accents ni ponctuation, espaces simples."""
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return " ".join(re.sub(r"[^\w]+", " ", s).split())


def _surnames(authors):
    return {norm(a).split()[-1] for a in authors if norm(a)}


def pick_cover(docs, titles, authors):
    """Œuvre Open Library qui correspond (titre identique, auteur par nom de famille), la plus éditée."""
    want = {norm(t) for t in titles if norm(t)}
    surnames = _surnames(authors)
    ok = []
    for d in docs:
        if not d.get("cover_i"):
            continue
        raw = d.get("title") or ""
        if norm(raw) not in want and norm(raw.split(":")[0]) not in want:  # « Titre : sous-titre »
            continue
        doc_tokens = {tok for a in d.get("author_name") or [] for tok in norm(a).split()}
        if surnames and not surnames & doc_tokens:
            continue
        ok.append(d)
    if not ok:
        return None
    best = max(ok, key=lambda d: d.get("edition_count") or 0)
    return {"cover_i": best["cover_i"], "key": best["key"]}


def get(url, binary=False):
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read() if binary else json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(2 ** attempt)
        except Exception:  # noqa: BLE001  réseau instable
            time.sleep(2 ** attempt)
    return None


def find(book):
    titles = [t for t in (book.get("orig"), book.get("fr"), book.get("en")) if t]
    authors = [a for a in (book.get("author"), book.get("author_en")) if a]
    surname = (_surnames(authors) or {""}).pop()
    for t in dict.fromkeys(titles):
        q = urllib.parse.urlencode({"title": t, "author": surname, "fields": "key,title,author_name,cover_i,edition_count", "limit": 20})
        data = get(f"https://openlibrary.org/search.json?{q}")
        hit = pick_cover((data or {}).get("docs") or [], titles, authors)
        if hit:
            return hit
        time.sleep(1)
    return None


def main():
    retry = "--retry" in sys.argv
    books = {iso: e["book"] for iso, e in json.loads(BOOKS.read_text()).items() if e.get("book")}
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for iso, b in sorted(books.items()):
        qid = b["qid"]
        if qid in cache and (cache[qid] or not retry):
            continue
        hit = find(b)
        entry = None
        if hit:
            img = get(f"https://covers.openlibrary.org/b/id/{hit['cover_i']}-L.jpg?default=false", binary=True)
            if img and len(img) > 2000:
                (OUT_DIR / f"{qid}.jpg").write_bytes(img)
                entry = {"file": f"/covers/{qid}.jpg", "credit": f"https://openlibrary.org{hit['key']}"}
        cache[qid] = entry
        CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
        print(iso, qid, "ok" if entry else "-", flush=True)
        time.sleep(1)
    n = sum(1 for b in books.values() if cache.get(b["qid"]))
    print(f"{n}/{len(books)} livres avec couverture")


if __name__ == "__main__":
    main()
