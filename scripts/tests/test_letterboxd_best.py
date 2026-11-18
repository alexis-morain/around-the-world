import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import letterboxd_best as lb  # noqa: E402


def entry(**kw):
    return {"tmdb": 1, "countries": ["KR"], "origin": ["KR"], **kw}


class Keep(unittest.TestCase):
    def test_film_national_different_du_notre(self):
        self.assertTrue(lb.keep("KR", entry(tmdb=496243), our_tmdb=255709))

    def test_meme_film_que_le_notre(self):
        self.assertFalse(lb.keep("KR", entry(tmdb=255709), our_tmdb=255709))

    def test_production_etrangere(self):
        self.assertFalse(lb.keep("ID", entry(countries=["DK", "NO", "GB"], origin=["DK"]), our_tmdb=2))

    def test_coproduction_qui_inclut_le_pays(self):
        self.assertTrue(lb.keep("AO", entry(countries=["AO", "FR"], origin=["AO"]), our_tmdb=2))

    def test_tournage_sur_place_d_un_film_etranger(self):
        self.assertFalse(lb.keep("BJ", entry(countries=["BJ", "US"], origin=["US"]), our_tmdb=2))

    def test_sans_origine_le_premier_pays_de_production(self):
        self.assertTrue(lb.keep("AO", entry(countries=["AO", "FR"], origin=[]), our_tmdb=2))
        self.assertFalse(lb.keep("FR", entry(countries=["AO", "FR"], origin=[]), our_tmdb=2))

    def test_film_sovietique_pour_un_pays_issu_de_l_urss(self):
        self.assertTrue(lb.keep("AM", entry(countries=["SU"], origin=["SU"]), our_tmdb=2))

    def test_film_yougoslave_et_tchecoslovaque(self):
        self.assertTrue(lb.keep("RS", entry(countries=["YU"], origin=["YU"]), our_tmdb=2))
        self.assertTrue(lb.keep("SK", entry(countries=["XC"], origin=["XC"]), our_tmdb=2))

    def test_sans_fiche_tmdb(self):
        self.assertFalse(lb.keep("KR", entry(tmdb=None), our_tmdb=2))

    def test_pays_sans_film_chez_nous(self):
        self.assertTrue(lb.keep("KR", entry(tmdb=5), our_tmdb=None))


if __name__ == "__main__":
    unittest.main()
