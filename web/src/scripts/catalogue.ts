/* Catalogue : trois onglets (films, livres, séries), filtres et tri sur les cartes rendues au build. L'état est dans l'URL (?tab=book&continent=asia&sort=pop). */
import { KINDS, SORTS, matches, sortItems, workKey, type Filters, type Item, type Kind, type SortKey } from "../lib/logic";
import { all, onChange } from "./store";
import { lang } from "./ui";

const num = (v?: string) => (v ? Number(v) : null);
interface ClientData {
  sorts: Record<Kind, [SortKey, string][]>;
  counts: Record<Kind, [string, string, string]>;
  decades: Record<Kind, [number, string][]>;
  langs: Record<Kind, [string, string][]>;
}

export function initCatalogue() {
  const form = document.getElementById("filters") as HTMLFormElement;
  const count = document.getElementById("count")!;
  const data = JSON.parse(document.getElementById("cat-data")!.textContent!) as ClientData;
  const tabs = [...document.querySelectorAll<HTMLButtonElement>("[data-tab]")];
  const panels = new Map(KINDS.map((k) => [k, document.querySelector<HTMLElement>(`[data-panel="${k}"]`)!]));
  const grids = new Map(KINDS.map((k) => [k, document.querySelector<HTMLElement>(`[data-grid="${k}"]`)!]));
  const items = new Map<string, { it: Item; li: HTMLLIElement }>();
  const byKind: Record<Kind, Item[]> = { film: [], book: [], series: [] };
  for (const a of document.querySelectorAll<HTMLAnchorElement>("a.card[data-title]")) {
    const d = a.dataset;
    const it: Item = {
      kind: d.kind as Kind, iso: d.iso!, country: d.country!, title: d.title!, alt: d.alt!, year: num(d.year), runtime: num(d.runtime),
      level: d.level!, continent: d.continent!, lang: d.lang!, anim: !!d.anim, fr: !!d.fr, imdb: num(d.imdb), rt: num(d.rt), pop: num(d.pop),
    };
    items.set(workKey(it.kind, it.iso), { it, li: a.parentElement as HTMLLIElement });
    byKind[it.kind].push(it);
  }
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;

  let kind: Kind = "film";

  /** Remplit un select avec ses options, en gardant la valeur courante si elle existe encore. */
  function fill(sel: HTMLSelectElement, first: [string, string] | null, opts: [string | number, string][]) {
    const keep = sel.value;
    sel.replaceChildren(...[...(first ? [first] : []), ...opts].map(([v, l]) => new Option(l, String(v))));
    sel.value = [...sel.options].some((o) => o.value === keep) ? keep : sel.options[0].value;
  }

  function setTab(k: Kind) {
    kind = k;
    for (const t of tabs) {
      const on = t.dataset.tab === k;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    }
    for (const [pk, p] of panels) p.hidden = pk !== k;
    const sort = field("sort") as HTMLSelectElement;
    fill(sort, null, data.sorts[k]);
    const dec = field("decade") as HTMLSelectElement;
    fill(dec, [dec.options[0]?.value ?? "", dec.options[0]?.text ?? ""], data.decades[k]);
    const lg = field("lang") as HTMLSelectElement;
    fill(lg, [lg.options[0]?.value ?? "", lg.options[0]?.text ?? ""], data.langs[k]);
    lg.hidden = data.langs[k].length === 0;
    if (lg.hidden) lg.value = "";
    form.querySelectorAll<HTMLElement>("[data-only]").forEach((el) => {
      const show = el.dataset.only === k;
      el.hidden = !show;
      if (!show) {
        const input = el.matches("input,select") ? el : el.querySelector("input,select");
        if (input instanceof HTMLInputElement) input.checked = false;
        else if (input instanceof HTMLSelectElement) input.value = "";
      }
    });
  }

  // l'URL d'arrivée (lien « Tout voir » d'une rangée) choisit l'onglet et pré-remplit le formulaire
  const params = new URLSearchParams(location.search);
  const tab = params.get("tab");
  setTab(KINDS.includes(tab as Kind) ? (tab as Kind) : "film");
  for (const [k, v] of params) {
    if (k === "tab") continue;
    const f = form.elements.namedItem(k);
    if (f instanceof HTMLInputElement && f.type === "checkbox") f.checked = v === "1";
    else if (f instanceof HTMLInputElement || f instanceof HTMLSelectElement) f.value = v;
  }

  const read = (): Filters & { sort: SortKey } => {
    const fd = new FormData(form);
    const s = (k: string) => String(fd.get(k) || "");
    const sort = s("sort") as SortKey;
    return {
      q: s("q"), continent: s("continent"), level: s("level"), decade: s("decade"), duration: s("duration"), lang: s("lang"),
      fr: fd.has("fr"), anim: fd.has("anim"), unseen: fd.has("unseen"), list: fd.has("list"),
      sort: SORTS[kind].includes(sort) ? sort : "country",
    };
  };

  function apply() {
    const f = read();
    const ctx = { seen: all("seen"), list: all("list") };
    const grid = grids.get(kind)!;
    let n = 0;
    for (const it of sortItems(byKind[kind], f.sort, lang())) {
      const li = items.get(workKey(kind, it.iso))!.li;
      const ok = matches(it, f, ctx);
      li.hidden = !ok;
      if (ok) n++;
      grid.append(li); // l'ordre du DOM suit le tri : la tabulation reste logique
    }
    const [zero, one, many] = data.counts[kind];
    count.textContent = n === 0 ? zero : n === 1 ? one : many.replace("{n}", String(n));
    const qs = new URLSearchParams();
    if (kind !== "film") qs.set("tab", kind);
    for (const [k, v] of Object.entries(f)) {
      if (v === true) qs.set(k, "1");
      else if (typeof v === "string" && v && !(k === "sort" && v === "country")) qs.set(k, v);
    }
    const url = `${location.pathname}${qs.size ? `?${qs}` : ""}`;
    if (url !== location.pathname + location.search) history.replaceState(history.state, "", url);
  }

  for (const t of tabs) {
    t.addEventListener("click", () => { setTab(t.dataset.tab as Kind); apply(); });
    t.addEventListener("keydown", (e) => {
      const i = tabs.indexOf(t);
      const next = e.key === "ArrowRight" ? tabs[(i + 1) % tabs.length] : e.key === "ArrowLeft" ? tabs[(i + tabs.length - 1) % tabs.length] : null;
      if (!next) return;
      e.preventDefault();
      next.focus();
      setTab(next.dataset.tab as Kind);
      apply();
    });
  }

  let timer = 0;
  form.addEventListener("input", (e) => {
    clearTimeout(timer);
    if ((e.target as HTMLInputElement).type === "search") timer = window.setTimeout(apply, 140);
    else apply();
  });
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("reset", () => setTimeout(() => { setTab(kind); apply(); }));
  onChange(() => { const f = read(); if (f.unseen || f.list) apply(); });
  apply();
}
