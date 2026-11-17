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


class AutoLevel(unittest.TestCase):
    def test_seuils(self):
        self.assertEqual(bs.auto_level("book", 10), "B")
        self.assertEqual(bs.auto_level("book", 9), "C")
        self.assertEqual(bs.auto_level("series", 50), "B")
        self.assertEqual(bs.auto_level("series", 3), "C")


if __name__ == "__main__":
    unittest.main()
