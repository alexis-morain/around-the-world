# Spec recherche : livre le plus lu et série la plus vue de chaque pays

Objectif : pour chaque pays de la région assignée, trouver avec une source :

1. **le livre** national le plus lu ou le plus vendu dans ce pays ;
2. **la série** télévisée nationale la plus regardée dans ce pays.

Un choix automatique existe déjà dans `data/livres_series.json` (clé = code
ISO2 ; livre = le plus d'articles Wikipédia, série = la plus votée sur TMDB).
Pars de lui : confirme-le avec une source, ou remplace-le par mieux sourcé.
Les notes d'arbitrage déjà faites sont dans `data/overrides_livres_series.json` :
respecte leurs exclusions, sauf source qui les contredit.

## Règles communes

- National : auteur du pays (pour un État disparu, né sur le territoire actuel)
  ou série produite d'abord dans le pays. Coproduction acceptée si le pays est
  le pays créatif principal.
- Langue : une langue parlée dans le pays. Pas d'œuvre écrite ou tournée en
  anglais pour l'export, sauf pays anglophones.
- Ne devine jamais un chiffre. Sans source, `level` = `none` et une note courte.
- Les sources en ligne citées doivent être consultées (URL réelle).

## Livre

- Œuvre littéraire : roman, nouvelles, poésie, théâtre, conte, bande dessinée.
  Exclure textes sacrés, textes politiques ou de propagande, essais, manuels,
  mémoires de chefs d'État.
- Critère, par ordre de préférence : ventes cumulées dans le pays ; classement
  « livre le plus lu / préféré » d'un sondage national sérieux ; classique au
  programme scolaire national, cité comme tel par une source.
- `metric` : `sales`, `survey` ou `canon`.

## Série

- Fiction télévisée ou en streaming (feuilleton, telenovela, sitcom, animation
  acceptée). Exclure information, téléréalité, jeux, talk-shows, sport,
  documentaires.
- Critère, par ordre de préférence : record d'audience d'un épisode ou audience
  moyenne mesurée dans le pays (Médiamétrie, BARB, Nielsen, AGB, Kantar, etc.) ;
  classement d'une plateforme nationale ; presse qui la présente comme la série
  la plus regardée du pays.
- `metric` : `ratings` (audience mesurée), `streaming`, `press`.
- Donne l'identifiant TMDB si tu le trouves (themoviedb.org/tv/<id>).

## Sortie

Fichier JSON valide (tableau, sans commentaires) au chemin indiqué dans ta
mission, un objet par pays de la région, y compris ceux sans donnée :

```json
{
  "iso2": "FR",
  "book": {
    "level": "A",
    "title_original": "Le Petit Prince",
    "title_fr": "Le Petit Prince",
    "title_en": "The Little Prince",
    "author": "Antoine de Saint-Exupéry",
    "year": 1943,
    "language": "fr",
    "wikidata": "Q25338",
    "metric": "sales",
    "value": "plus de 12 millions d'exemplaires en France",
    "source_url": "https://...",
    "note": ""
  },
  "series": {
    "level": "A",
    "title_original": "Plus belle la vie",
    "title_fr": "Plus belle la vie",
    "title_en": "Plus belle la vie",
    "year": 2004,
    "language": "fr",
    "tmdb_id": 12345,
    "metric": "ratings",
    "value": "...",
    "source_url": "https://...",
    "note": ""
  }
}
```

`level` vaut `A` si une source chiffrée ou explicite existe, `none` sinon (les
autres champs peuvent alors être vides, garde une note). Le QID Wikidata et
l'id TMDB sont précieux : cherche-les (wikidata.org, themoviedb.org).

Réponds à la fin par un résumé : nombre de livres et de séries de niveau A,
pays ambigus.

## Deuxième passe (bsA2)

Ciblée sur les pays sans niveau A, listés dans ta mission avec le type cherché
(livre, série ou les deux). Mêmes règles, avec trois précisions tirées de la
première passe :

- `A` seulement si la source porte sur le pays : ventes ou tirages dans le pays,
  sondage de lecteurs ou de téléspectateurs du pays, programme scolaire national,
  audience mesurée dans le pays. Un chiffre mondial, un classement régional
  (panarabe, latino-américain), une mention sans chiffre, un blog ou un réseau
  social ne suffisent pas : mets `none` et nomme le candidat dans `note`.
- Ouvre la page source elle-même. Si tu n'as vu qu'un extrait de résultat de
  recherche, écris-le dans `note`.
- N'écris que les pays de ta liste, et seulement le type demandé (l'autre clé
  absente). Un `none` n'efface pas un A existant : pas besoin de recopier.

Fichier de sortie : `data/raw/bsA2_<region>.json`, même format.
