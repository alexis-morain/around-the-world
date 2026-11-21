/* Liste des films à importer dans Letterboxd (https://letterboxd.com/list/new/, « Import »). */
import { lbFilms } from "../lib/films";
import { letterboxdCsv } from "../lib/logic";

export const GET = () => new Response(letterboxdCsv(lbFilms("fr"), "fr"), { headers: { "Content-Type": "text/csv; charset=utf-8" } });
