# Méthode : Around the World

Pour chaque pays, trois œuvres nationales : le film le plus vu en salle, le livre le plus lu et la série la plus regardée dans le pays.

# Films

Question posée : quel est le film NATIONAL que les gens de chaque pays ont le plus vu ?

## Règles communes

- Film national : la production et l'équipe créative viennent principalement du pays. Un financement ou un tournage ne suffit pas.
- Langue : une langue parlée dans le pays. Les films tournés en anglais pour l'export sont exclus, sauf dans les pays anglophones.
- Long-métrage de fiction. L'animation est acceptée et signalée. Les documentaires sont exclus.
- Un même film n'est attribué qu'à un seul pays.

## Niveaux, du plus fiable au moins fiable

- A : box-office national sourcé. On prend le film national qui a fait le plus d'entrées dans le pays, ou à défaut le plus de recettes nationales. Les recettes mondiales ne comptent pas. Sources : Wikipedia, instituts nationaux du cinéma, base LUMIERE de l'Observatoire européen de l'audiovisuel, presse.
- B : pas de box-office. On prend le film du pays le plus voté sur TMDB, à partir de 50 votes, dans une langue du pays, en préférant les films dont le pays est le producteur principal. Ça mesure la notoriété internationale plus que l'audience locale.
- C : données trop rares. On prend le premier choix « native voice » de Films Around the World (filmsaroundthe.world), un choix éditorial fondé sur la réputation, pas sur l'audience.
- D : dernier recours. On prend le film du pays le plus voté sur TMDB, avec moins de 50 votes.

## Limites connues

- Les records de niveau A mélangent les époques. Certains pays ont un record ancien et mieux documenté en entrées (Pologne 1960, Royaume-Uni 1948), d'autres un record récent en recettes, gonflé par le prix des billets.
- Pour les pays de l'ex-URSS et de l'ex-Yougoslavie, l'attribution des films d'avant l'indépendance est discutable. C'est noté au cas par cas.
- Là où le cinéma populaire passe par YouTube ou la vidéo (Somalie, Nollywood, Éthiopie), la colonne « Phénomène vidéo » donne le candidat quand il est connu.
- La colonne « Où le voir en France » vient de TMDB (données JustWatch), au moment de l'export.

## Projets voisins consultés

- Films Around the World : un guide par pays, avec une méthode publique (https://filmsaroundthe.world/methodology/).
- EkulRF/BestFilmsByCountry sur GitHub : le film le mieux noté sur TMDB par pays, sans filtre de langue.
- Listes Letterboxd « un film par pays » (jamesjonathan, tdieckma, johnmilton), Witterworld (BBC), Movies with Macca.
- Wikipedia : catégorie « Lists of highest-grossing films by region ».

# Livres et séries

Mêmes règles d'origine et de langue que pour les films : auteur du pays, ou série produite d'abord dans le pays, dans une langue parlée dans le pays. Consigne de recherche complète : `docs/spec-livres-series.md`.

## Ordre de priorité

1. Recherche sourcée (`data/raw/bsA_*.json`, six agents, un par région).
2. Arbitrage manuel (`data/overrides_livres_series.json`, chaque entrée a sa note). Un arbitrage peut aussi écarter un résultat de recherche, par exemple la série ukrainienne *Сваты*, tournée en russe.
3. Choix automatique : pour le livre, l'œuvre littéraire d'un auteur du pays qui a le plus d'articles Wikipédia (Wikidata via QLever, textes religieux et politiques exclus) ; pour la série, la série du pays (pays d'origine cité en premier) la plus votée sur TMDB, à partir de 3 votes.

## Niveaux

- A : source chiffrée ou explicite. Livre : ventes dans le pays, sondage national de lecture, ou œuvre au programme scolaire national. Série : record ou moyenne d'audience mesurée dans le pays (Médiamétrie, Nielsen, BARB, Kantar…).
- B : signal fort. Un choix de recherche qui ne tient qu'à un chiffre mondial, à une mention sans chiffre ou à une seule saison, ou un choix automatique au-dessus du seuil (au moins 10 articles Wikipédia pour un livre, 50 votes TMDB pour une série).
- C : choix automatique sous le seuil.

## Limites connues

- Les petits pays ont peu de sources : 34 pays sans livre et 106 sans série.
- Plusieurs niveaux A reposent sur des extraits de recherche plutôt que sur la page complète de la source ; la note de chaque œuvre le signale.
- Certains titres français de séries sont des traductions faites pendant la recherche.
- Résumés : début de l'article Wikipédia pour les livres (CC BY-SA), synopsis TMDB pour les séries. Couvertures : Open Library, sinon une couverture typographique.
