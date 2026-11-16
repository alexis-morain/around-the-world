"""Écrit data/ratings.json : notes (IMDb, TMDB, Rotten Tomatoes via Radarr) et bande-annonce YouTube (TMDB).

Usage : python3 -I scripts/enrich_ratings.py [--refresh]
Les clés viennent de .env (TMDB_API_KEY, RADARR_URL, RADARR_API_KEY) et ne sont jamais affichées.
Sans --refresh, seuls les films absents de data/ratings.json sont interrogés.
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAUSE = 0.1  # ~10 requêtes/s


def parse_env(text):
    """Parseur .env minimal : CLE=valeur, commentaires et guillemets ignorés."""
    env = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
            val = val[1:-1]
        env[key.strip()] = val
    return env


def _score(block, need_votes):
    """Une note à 0 ou absente (ou, si demandé, sans votes) vaut None."""
    if not isinstance(block, dict) or not block.get("value"):
        return None
    if need_votes and not block.get("votes"):
        return None
    return block


def parse_ratings(ratings):
    """Réduit le bloc `ratings` de Radarr aux trois notes gardées."""
    ratings = ratings or {}
    out = {}
    for key in ("imdb", "tmdb"):
        b = _score(ratings.get(key), True)
        out[key] = {"value": float(b["value"]), "votes": int(b["votes"])} if b else None
    rt = _score(ratings.get("rottenTomatoes"), False)
    out["rt"] = {"value": rt["value"]} if rt else None
    return out


def pick_video(videos):
    """Clé YouTube de la meilleure vidéo : Trailer, puis Teaser, puis officielle, puis la plus récente."""
    yt = [x for x in videos if x.get("site") == "YouTube" and x.get("key")]
    if not yt:
        return None
    rank = {"Trailer": 2, "Teaser": 1}
    best = max(yt, key=lambda x: (rank.get(x.get("type"), 0), bool(x.get("official")),
                                  x.get("published_at") or ""))
    return best["key"]


def find_trailer(fetch):
    """`fetch(langue)` renvoie la liste de vidéos. Essaie fr-FR, en-US, puis sans langue."""
    for lang, code in (("fr-FR", "fr"), ("en-US", "en"), (None, "xx")):
        key = pick_video(fetch(lang))
        if key:
            return {"key": key, "lang": code}
    return None


def get_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.load(resp)


def main(argv):
    refresh = "--refresh" in argv
    env = parse_env((ROOT / ".env").read_text())
    tmdb_key, radarr_url, radarr_key = (env.get(k) for k in ("TMDB_API_KEY", "RADARR_URL", "RADARR_API_KEY"))
    if not (tmdb_key and radarr_url and radarr_key):
        sys.exit("Variables manquantes dans .env (TMDB_API_KEY, RADARR_URL, RADARR_API_KEY).")

    films = json.loads((ROOT / "data" / "films_du_monde.json").read_text())
    ids = sorted({str(r["tmdb_id"]) for r in films if r.get("tmdb_id")}, key=int)
    path = ROOT / "data" / "ratings.json"
    cache = json.loads(path.read_text()) if path.exists() and not refresh else {}
    todo = [i for i in ids if i not in cache]
    print(f"{len(ids)} films, {len(todo)} à interroger")

    def radarr(tid):
        url = f"{radarr_url.rstrip('/')}/api/v3/movie/lookup/tmdb?tmdbId={tid}"
        return get_json(url, {"X-Api-Key": radarr_key}).get("ratings")

    def videos(tid, lang):
        q = {"api_key": tmdb_key}
        if lang:
            q["language"] = lang
        return get_json(f"https://api.themoviedb.org/3/movie/{tid}/videos?{urllib.parse.urlencode(q)}").get("results", [])

    def paused(fn):
        time.sleep(PAUSE)
        return fn()

    failed = []
    for n, tid in enumerate(todo, 1):
        try:
            entry = parse_ratings(paused(lambda: radarr(tid)))
            entry["trailer"] = find_trailer(lambda lang: paused(lambda: videos(tid, lang)))
        except (urllib.error.URLError, OSError, ValueError) as e:
            # jamais l'URL (la clé TMDB y figure) : seulement le type d'erreur
            failed.append(f"{tid} ({type(e).__name__})")
            continue
        cache[tid] = entry
        if n % 25 == 0:
            print(f"  {n}/{len(todo)}")

    cache = dict(sorted(cache.items(), key=lambda kv: int(kv[0])))
    path.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    have = lambda k: sum(1 for e in cache.values() if e.get(k))
    print(f"{len(cache)} films enregistrés : IMDb {have('imdb')}, TMDB {have('tmdb')}, "
          f"RT {have('rt')}, bande-annonce {have('trailer')}")
    if failed:
        print("Échecs (relancer le script) :", ", ".join(failed))


if __name__ == "__main__":
    main(sys.argv[1:])
