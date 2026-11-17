# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Site statique Astro + Tailwind CSS dans `web/` (sans bibliothèque de composants). Une fiche par pays (`/pays/<iso>/`, en anglais `/en/country/<iso>/`), ouverte en modale depuis l'accueil et le catalogue. Les anciennes adresses `/film/<iso>/` redirigent vers la fiche pays. d3 chargé à la demande pour la carte, polices hébergées par fontsource. Vercel construit `web/` à chaque push sur `main`.

## Users

Deux publics, à égalité :
- Alexis et ses proches, qui font une soirée par pays : ils tirent un pays, regardent son film, lisent son livre ou suivent sa série, puis cochent ce qu'ils ont fait. Ils ouvrent le site sur ordinateur comme sur téléphone, et les deux doivent être aussi soignés.
- Les visiteurs venus de GitHub ou de Reddit, qui explorent la carte, découvrent des œuvres et vérifient la méthode.

## Product Purpose

Around the World (« Le tour du monde en œuvres », en anglais « Around the World in Stories ») donne, pour chaque pays, trois œuvres nationales : le film, le livre et la série que ses habitants ont le plus vus ou lus, dans leur langue d'origine. Le pays est l'unité. Le site est réussi si on peut choisir sa prochaine soirée en quelques secondes, et si un visiteur comprend tout de suite pourquoi chaque œuvre a été choisie et à quel point ce choix est fiable.

## Positioning

Les autres listes « un film par pays » classent à la note ou à la réputation critique, et ne couvrent qu'un type d'œuvre. Celle-ci classe à l'audience nationale (box-office, ventes, audiences mesurées) quand la donnée existe, met le film, le livre et la série au même niveau, et affiche pour chaque choix son niveau de fiabilité au lieu de faire comme si tous se valaient.

## Operating Context

- Soirée : le tirage au hasard d'un pays, sa fiche avec ses trois œuvres, l'endroit où voir le film en France, puis les cases « vu » et « ma liste », œuvre par œuvre. Le suivi reste dans le navigateur (localStorage, clés `film:FR`, `book:FR`, `series:FR`), il n'y a pas de compte.
- Exploration : le pays du jour avec ses trois œuvres côte à côte, la carte (sélecteur film, livre, série ou tout, couleur selon ce qui est fait), les rangées par type et par continent, le catalogue à trois onglets avec filtres, la méthode.
- « Ma liste » garde les œuvres pour plus tard, à côté de « vu ».

## Capabilities and Constraints

- 199 pays et territoires. Données dans `web/src/data/films.json`, produites par `scripts/export_site.py` : un film, un livre et une série par pays quand ils existent (196 films, 165 livres, 93 séries au 17/11/2026). Un pays peut manquer d'une œuvre : la fiche le dit sans bloc vide.
- Niveaux de fiabilité A à D, propres à chaque type :
  - film : A box-office national sourcé, B le plus noté sur TMDB (50 votes minimum), C choix éditorial, D dernier recours ;
  - livre : A ventes, sondage ou classique scolaire avec source, B au moins 10 articles Wikipédia, C moins, D choix manuel sans signal ;
  - série : A audience mesurée ou source explicite, B au moins 50 votes TMDB, C moins, D choix manuel sans signal.
- Notes IMDb, TMDB et Rotten Tomatoes et bandes-annonces relevées au build (`data/ratings.json`), aucune clé côté client.
- Bilingue français et anglais. Les notes d'arbitrage et les chiffres de ventes ou d'audience sont en français ; la fiche anglaise le signale.
- Affiches de films et de séries et résumés viennent de TMDB, avec la mention d'attribution obligatoire. Les plateformes de diffusion en France viennent de JustWatch, via TMDB. Les couvertures de livres viennent d'Open Library (crédit affiché), sinon une couverture typographique dessinée en CSS. Les extraits de livres viennent de Wikipédia (CC BY-SA), crédités avec le lien de l'article.
- Les micro-États sans polygone visible sur la carte sont représentés par un point.

## Evidence on Hand

- Les données sourcées : niveau, critère, valeur et source de chaque œuvre (`data/films_du_monde.json`, `data/livres_series.json`).
- La méthode (`docs/methode.md`, page Méthode du site) et les arbitrages manuels (`data/overrides.json`, `data/overrides_livres_series.json`).
- Aucune donnée d'usage ni aucun témoignage : n'en inventer aucun.

## Product Principles

1. Le film, le livre et la série ont le même poids sur la fiche pays : même taille d'image, même structure, même tampon de niveau. Une œuvre absente se dit, elle ne se cache pas.
2. Le niveau de fiabilité est toujours visible sur la fiche, pour chaque œuvre (tampon A à D et sa phrase), jamais caché. Il ne colore pas la carte.
3. Chaque choix est traçable jusqu'à sa source.
4. On doit pouvoir passer de la carte au pays en un clic, et du pays à l'endroit où voir le film ou à l'article du livre.
5. Le suivi des soirées marche sans compte et sans rien envoyer à un serveur.

## Accessibility & Inclusion

Le contraste du texte respecte WCAG AA. Les rangées et le catalogue sont le chemin accessible au clavier, en plus de la carte. Aucun débordement à 360 px. Mouvement réduit respecté.
