"""Tests du choix de couverture Open Library (logique pure)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import book_covers as bc

DOCS = [
    {"key": "/works/OL17988045W", "title": "Pedro Páramo de Juan Rulfo", "author_name": ["Carmen Arcas Ruano"], "cover_i": 3, "edition_count": 1},
    {"key": "/works/OL1731097W", "title": "Pedro Páramo / El llano en llamas", "author_name": ["Juan Rulfo"], "cover_i": 2, "edition_count": 25},
    {"key": "/works/OL1731119W", "title": "Pedro Páramo", "author_name": ["Juan Rulfo"], "cover_i": 1, "edition_count": 135},
]


class Norm(unittest.TestCase):
    def test_sans_accents_ni_ponctuation(self):
        self.assertEqual(bc.norm("Pedro Páramo !"), "pedro paramo")
        self.assertEqual(bc.norm("L’Étranger"), "l etranger")


class PickCover(unittest.TestCase):
    def test_garde_l_oeuvre_de_l_auteur_la_plus_editee(self):
        self.assertEqual(bc.pick_cover(DOCS, ["Pedro Páramo"], ["Juan Rulfo"]),
                         {"cover_i": 1, "key": "/works/OL1731119W"})

    def test_refuse_un_autre_auteur(self):
        docs = [DOCS[0]]
        self.assertIsNone(bc.pick_cover(docs, ["Pedro Páramo"], ["Juan Rulfo"]))

    def test_refuse_sans_couverture(self):
        docs = [{**DOCS[2], "cover_i": None}]
        self.assertIsNone(bc.pick_cover(docs, ["Pedro Páramo"], ["Juan Rulfo"]))

    def test_accepte_un_des_titres_connus(self):
        docs = [{"key": "/works/X", "title": "The Little Prince", "author_name": ["Antoine de Saint-Exupéry"], "cover_i": 9, "edition_count": 3}]
        self.assertEqual(bc.pick_cover(docs, ["Le Petit Prince", "The Little Prince"], ["Antoine de Saint-Exupéry"]),
                         {"cover_i": 9, "key": "/works/X"})

    def test_auteur_par_nom_de_famille(self):
        docs = [{"key": "/works/Y", "title": "Kobzar", "author_name": ["Taras Hryhorovych Shevchenko"], "cover_i": 4, "edition_count": 2}]
        self.assertEqual(bc.pick_cover(docs, ["Kobzar"], ["Taras Shevchenko"]), {"cover_i": 4, "key": "/works/Y"})


if __name__ == "__main__":
    unittest.main()
