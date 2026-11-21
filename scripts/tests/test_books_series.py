"""Tests de la priorité recherche > arbitrage > automatique (books_series)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import books_series as bs


class Resolve(unittest.TestCase):
    def test_recherche_a_gagne(self):
        self.assertEqual(bs.resolve("Q1", {"book": "Q2"}, {"level": "A", "wikidata": "Q3"}, "book"), ("research", "Q3"))

    def test_recherche_a_sans_identifiant_reste_recherche(self):
        self.assertEqual(bs.resolve("Q1", {}, {"level": "A", "wikidata": ""}, "book"), ("research", None))

    def test_recherche_none_laisse_l_arbitrage(self):
        self.assertEqual(bs.resolve("Q1", {"book": "Q2"}, {"level": "none"}, "book"), ("override", "Q2"))
        self.assertEqual(bs.resolve("Q1", {"book": None}, None, "book"), ("override", None))

    def test_recherche_ecartee_par_arbitrage(self):
        self.assertEqual(bs.resolve(5, {"series_research": False, "series": 7}, {"level": "A", "tmdb_id": 9}, "series"), ("override", 7))

    def test_sinon_automatique(self):
        self.assertEqual(bs.resolve("Q1", {}, None, "book"), ("auto", "Q1"))

    def test_serie_par_tmdb_id(self):
        self.assertEqual(bs.resolve(5, {}, {"level": "A", "tmdb_id": 9}, "series"), ("research", 9))


class MergeResearch(unittest.TestCase):
    def test_un_a_plus_recent_remplace_par_type(self):
        first = [{"iso2": "SE", "book": {"level": "A", "wikidata": "Q1"}, "series": {"level": "none"}}]
        second = [{"iso2": "SE", "book": {"level": "none"}, "series": {"level": "A", "tmdb_id": 9}}]
        out = bs.merge_research([first, second])
        self.assertEqual(out["SE"]["book"]["wikidata"], "Q1")
        self.assertEqual(out["SE"]["series"]["tmdb_id"], 9)

    def test_un_none_n_efface_pas_un_a(self):
        first = [{"iso2": "SE", "book": {"level": "A", "wikidata": "Q1"}}]
        second = [{"iso2": "SE", "book": {"level": "none", "note": "rien"}}]
        self.assertEqual(bs.merge_research([first, second])["SE"]["book"]["wikidata"], "Q1")

    def test_le_dernier_a_gagne(self):
        first = [{"iso2": "SE", "book": {"level": "A", "wikidata": "Q1"}}]
        second = [{"iso2": "SE", "book": {"level": "A", "wikidata": "Q2"}}]
        self.assertEqual(bs.merge_research([first, second])["SE"]["book"]["wikidata"], "Q2")


class AutoLevel(unittest.TestCase):
    def test_seuils(self):
        self.assertEqual(bs.auto_level("book", 10), "B")
        self.assertEqual(bs.auto_level("book", 9), "C")
        self.assertEqual(bs.auto_level("series", 50), "B")
        self.assertEqual(bs.auto_level("series", 3), "C")


if __name__ == "__main__":
    unittest.main()


class PickTv(unittest.TestCase):
    R = [{"id": 1, "first_air_date": "2018-01-01", "origin_country": ["JP"]},
         {"id": 2, "first_air_date": "1999-05-01", "origin_country": ["CR"]},
         {"id": 3, "first_air_date": "2004-05-01", "origin_country": ["CR", "MX"]}]

    def test_ecarte_une_serie_d_un_autre_pays(self):
        self.assertIsNone(bs.pick_tv(self.R[:1], 2018, "CR"))

    def test_prefere_l_annee_parmi_le_bon_pays(self):
        self.assertEqual(bs.pick_tv(self.R, 2004, "CR"), 3)

    def test_sans_l_annee_premier_du_pays(self):
        self.assertEqual(bs.pick_tv(self.R, 2010, "CR"), 2)
