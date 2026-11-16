/* Catalogue : filtres et tri sur les affiches rendues au build. L'état est dans l'URL (?continent=asia&sort=imdb). */
import { matches, sortItems, type Filters, type Item, type SortKey } from "../lib/logic";
import { all, onChange } from "./store";
import { lang } from "./ui";

const num = (v?: string) => (v ? Number(v) : null);

export function initCatalogue() {
  const form = document.getElementById("filters") as HTMLFormElement;
  const grid = document.getElementById("grid")!;
  const count = document.getElementById("count")!;
  const items = [...grid.querySelectorAll<HTMLAnchorElement>("a.card")].map((a) => {
    const d = a.dataset;
    const it: Item = {
      iso: d.iso!, country: d.country!, title: d.title!, alt: d.alt!, year: num(d.year), runtime: num(d.runtime),
      level: d.level!, continent: d.continent!, lang: d.lang!, anim: !!d.anim, fr: !!d.fr, imdb: num(d.imdb), rt: num(d.rt),
    };
    return { it, li: a.parentElement as HTMLLIElement };
  });
  const liOf = new Map(items.map(({ it, li }) => [it.iso, li]));

  // l'URL d'arrivée (lien « Tout voir » d'une rangée) pré-remplit le formulaire
  const params = new URLSearchParams(location.search);
  for (const [k, v] of params) {
    const field = form.elements.namedItem(k);
    if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = v === "1";
    else if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = v;
  }

  const read = (): Filters & { sort: SortKey } => {
    const fd = new FormData(form);
    const s = (k: string) => String(fd.get(k) || "");
    return {
      q: s("q"), continent: s("continent"), level: s("level"), decade: s("decade"), duration: s("duration"), lang: s("lang"),
      fr: fd.has("fr"), anim: fd.has("anim"), unseen: fd.has("unseen"), list: fd.has("list"), sort: (s("sort") || "country") as SortKey,
    };
  };

  function apply() {
    const f = read();
    const ctx = { seen: all("seen"), list: all("list") };
    const sorted = sortItems(items.map((x) => x.it), f.sort, lang());
    let n = 0;
    for (const it of sorted) {
      const li = liOf.get(it.iso)!;
      const ok = matches(it, f, ctx);
      li.hidden = !ok;
      if (ok) n++;
      grid.append(li); // l'ordre du DOM suit le tri : la tabulation reste logique
    }
    const tpl = grid.dataset;
    count.textContent = n === 0 ? tpl.countZero! : n === 1 ? tpl.countOne! : tpl.countTpl!.replace("99999", String(n));
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) {
      if (v === true) qs.set(k, "1");
      else if (typeof v === "string" && v && !(k === "sort" && v === "country")) qs.set(k, v);
    }
    const url = `${location.pathname}${qs.size ? `?${qs}` : ""}`;
    if (url !== location.pathname + location.search) history.replaceState(history.state, "", url);
  }

  let timer = 0;
  form.addEventListener("input", (e) => {
    clearTimeout(timer);
    if ((e.target as HTMLInputElement).type === "search") timer = window.setTimeout(apply, 140);
    else apply();
  });
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("reset", () => setTimeout(apply));
  onChange(() => { const f = read(); if (f.unseen || f.list) apply(); });
  apply();
}
