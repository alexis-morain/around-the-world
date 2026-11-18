"""Le film le mieux noté de chaque pays sur Letterboxd, en regard du film le plus vu.

Source : la liste « The Best Movie From Every Country In The World » de Matias Luna
(octobre 2025), relevée dans data/raw/letterboxd_list.json (pays -> film et fiche TMDB).
On ne garde que les films originaires du pays (les États disparus comptent pour leurs
successeurs) et différents du film retenu. Écrit data/letterboxd_best.json.
"""
import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIST_URL = "https://letterboxd.com/matiaslunae/list/the-best-movie-from-every-country-in-the/"

FORMER = {
    "SU": {"RU", "UA", "BY", "GE", "AM", "AZ", "KZ", "KG", "UZ", "TJ", "TM", "LT", "LV", "EE", "MD"},
    "YU": {"RS", "HR", "BA", "SI", "MK", "ME", "XK"},
    "XC": {"CZ", "SK"},
}


def countries(e):
    """Pays d'origine (TMDB), sinon premier pays de production ; États disparus remplacés par leurs successeurs.

    Les pays de production de TMDB comptent aussi les lieux de tournage : ils ne suffisent pas.
    """
    out = set(e.get("origin") or (e.get("countries") or [])[:1])
    for old, new in FORMER.items():
        if old in out:
            out |= new
    return out


def keep(iso, e, our_tmdb):
    """Vrai si le film est produit par le pays et n'est pas déjà le film retenu."""
    return bool(e.get("tmdb")) and e["tmdb"] != our_tmdb and iso in countries(e)


def tmdb_titles(tmdb_id, key):
    out = {}
    for lang in ("fr-FR", "en-US"):
        q = urllib.parse.urlencode({"api_key": key, "language": lang})
        with urllib.request.urlopen(f"https://api.themoviedb.org/3/movie/{tmdb_id}?{q}", timeout=20) as r:
            d = json.load(r)
        out[lang[:2]] = d.get("title") or ""
        out["orig"] = d.get("original_title") or ""
    return out


def main():
    key = os.environ.get("TMDB_API_KEY") or next(
        line.split("=", 1)[1].strip() for line in (ROOT / ".env").read_text().splitlines()
        if line.startswith("TMDB_API_KEY="))
    raw = json.loads((ROOT / "data" / "raw" / "letterboxd_list.json").read_text())
    ours = {r["iso2"]: r.get("tmdb_id") for r in json.loads((ROOT / "data" / "films_du_monde.json").read_text())}
    out = {}
    for iso, e in sorted(raw.items()):
        if iso not in ours or not keep(iso, e, ours[iso]):
            continue
        t = tmdb_titles(e["tmdb"], key)
        out[iso] = {"tmdb_id": e["tmdb"], "slug": e["slug"], "year": str(e.get("year") or ""),
                    "orig": t["orig"], "fr": t["fr"], "en": t["en"]}
    path = ROOT / "data" / "letterboxd_best.json"
    path.write_text(json.dumps({"source": LIST_URL, "films": out}, ensure_ascii=False, indent=1) + "\n")
    print(len(out), "films ->", path)


if __name__ == "__main__":
    main()
