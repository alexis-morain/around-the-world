"""Tests de la logique pure de enrich_ratings (notes Radarr, choix de la vidéo, parseur .env)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import enrich_ratings as er


class ParseEnv(unittest.TestCase):
    def test_lit_cles_commentaires_et_guillemets(self):
        txt = '# commentaire\n\nA=1\nB = "deux"\nC=\'trois\'\nD=a=b\nsans_egal\n'
        self.assertEqual(er.parse_env(txt), {"A": "1", "B": "deux", "C": "trois", "D": "a=b"})


class ParseRatings(unittest.TestCase):
    def test_exemple_osama(self):
        r = {"imdb": {"votes": 9999, "value": 7.3}, "tmdb": {"votes": 137, "value": 7},
             "rottenTomatoes": {"votes": 0, "value": 96}}
        self.assertEqual(er.parse_ratings(r), {
            "imdb": {"value": 7.3, "votes": 9999},
            "tmdb": {"value": 7.0, "votes": 137},
            "rt": {"value": 96}})

    def test_zero_ou_absent_donne_none(self):
        r = {"imdb": {"votes": 0, "value": 7.0}, "tmdb": {"votes": 10, "value": 0},
             "rottenTomatoes": {"value": 0}}
        self.assertEqual(er.parse_ratings(r), {"imdb": None, "tmdb": None, "rt": None})
        self.assertEqual(er.parse_ratings({}), {"imdb": None, "tmdb": None, "rt": None})
        self.assertEqual(er.parse_ratings(None), {"imdb": None, "tmdb": None, "rt": None})


def v(key, type_="Trailer", site="YouTube", official=False, date="2020-01-01T00:00:00.000Z"):
    return {"key": key, "type": type_, "site": site, "official": official, "published_at": date}


class PickVideo(unittest.TestCase):
    def test_vide(self):
        self.assertIsNone(er.pick_video([]))

    def test_ignore_non_youtube(self):
        self.assertIsNone(er.pick_video([v("a", site="Vimeo")]))

    def test_trailer_avant_teaser(self):
        self.assertEqual(er.pick_video([v("t", "Teaser"), v("r", "Trailer")]), "r")

    def test_teaser_avant_autre(self):
        self.assertEqual(er.pick_video([v("c", "Clip"), v("t", "Teaser")]), "t")

    def test_officiel_puis_recent(self):
        vids = [v("old", date="2019-01-01"), v("new", date="2021-01-01"),
                v("off", official=True, date="2018-01-01")]
        self.assertEqual(er.pick_video(vids), "off")
        self.assertEqual(er.pick_video(vids[:2]), "new")

    def test_clip_seul_accepte(self):
        self.assertEqual(er.pick_video([v("c", "Clip")]), "c")


class FindTrailer(unittest.TestCase):
    def test_ordre_des_langues(self):
        calls = []

        def fetch(lang):
            calls.append(lang)
            return [v("en1")] if lang == "en-US" else []
        self.assertEqual(er.find_trailer(fetch), {"key": "en1", "lang": "en"})
        self.assertEqual(calls, ["fr-FR", "en-US"])

    def test_sans_langue_et_rien(self):
        self.assertEqual(er.find_trailer(lambda l: [v("x")] if l is None else []),
                         {"key": "x", "lang": "xx"})
        self.assertIsNone(er.find_trailer(lambda l: []))


if __name__ == "__main__":
    unittest.main()
