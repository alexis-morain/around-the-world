/* Film list to import into Letterboxd (https://letterboxd.com/list/new/, "Import"). */
import { lbFilms } from "../../lib/films";
import { letterboxdCsv } from "../../lib/logic";

export const GET = () => new Response(letterboxdCsv(lbFilms("en"), "en"), { headers: { "Content-Type": "text/csv; charset=utf-8" } });
