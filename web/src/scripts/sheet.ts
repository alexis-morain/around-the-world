/*
  Modale de fiche : charge l'<article> de la page /film/<iso>/ et l'affiche par-dessus l'accueil ou le catalogue.
  L'URL devient celle de la fiche (partageable), « retour » ferme la modale.
*/
import { bindFilm } from "./film";
import { filmUrl, reduced, announce } from "./ui";

const cache = new Map<string, Promise<string>>();
function load(iso: string) {
  if (!cache.has(iso)) {
    const p = fetch(filmUrl(iso)).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    }).then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const art = doc.getElementById("film")!;
      art.querySelector("[data-near]")?.remove();
      // le titre de la fiche devient un h2 dans la modale
      const h = art.querySelector("h1");
      if (h) { const h2 = doc.createElement("h2"); h2.className = h.className; h2.id = h.id; h2.lang = h.lang; h2.textContent = h.textContent; h.replaceWith(h2); }
      return art.outerHTML;
    });
    p.catch(() => cache.delete(iso));
    cache.set(iso, p);
  }
  return cache.get(iso)!;
}
export const prefetch = (iso: string) => { load(iso).catch(() => {}); };

let sheet: HTMLDialogElement, body: HTMLElement;
let unbind = () => {};
let opener: HTMLElement | null = null;
let homeUrl = "";
let currentIso = "";
const listeners = new Set<(iso: string | null) => void>();
export const onSheet = (fn: (iso: string | null) => void) => listeners.add(fn);

export async function openSheet(iso: string, { push = true, from }: { push?: boolean; from?: HTMLElement | null } = {}) {
  if (!sheet) return;
  opener = from ?? (document.activeElement as HTMLElement | null);
  if (!sheet.open) {
    homeUrl = location.pathname + location.search;
    body.innerHTML = `<div class="sheet-loading">…</div>`;
    sheet.classList.remove("closing");
    sheet.showModal();
    document.documentElement.style.overflow = "hidden";
  }
  currentIso = iso;
  if (push) history.pushState({ sheet: iso }, "", filmUrl(iso));
  listeners.forEach((fn) => fn(iso));
  try {
    const html = await load(iso);
    if (currentIso !== iso) return;
    unbind();
    body.innerHTML = html;
    unbind = bindFilm(body);
    sheet.scrollTop = 0;
    const title = body.querySelector("#film-title")?.textContent || "";
    document.title = `${title} · ${document.querySelector(".brand-name")?.textContent}`;
    announce(title);
  } catch {
    location.href = filmUrl(iso); // la page complète, sans modale
  }
}

function finishClose() {
  unbind(); unbind = () => {};
  sheet.close();
  sheet.classList.remove("closing");
  body.innerHTML = "";
  currentIso = "";
  document.documentElement.style.overflow = "";
  document.title = initialTitle;
  listeners.forEach((fn) => fn(null));
  opener?.focus({ preventScroll: true });
}
export function closeSheet({ pop = false } = {}) {
  if (!sheet?.open) return;
  if (!pop && history.state?.sheet) { history.back(); return; } // popstate refermera
  if (!pop) history.replaceState(null, "", homeUrl);
  if (reduced()) return finishClose();
  sheet.classList.add("closing");
  setTimeout(finishClose, 170);
}

let initialTitle = "";
export function initSheet() {
  sheet = document.getElementById("sheet") as HTMLDialogElement;
  body = document.getElementById("sheet-body")!;
  initialTitle = document.title;
  sheet.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(); });
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) closeSheet(); // clic sur le fond
    if ((e.target as Element).closest("[data-sheet-close]")) closeSheet();
  });
  window.addEventListener("popstate", (e) => {
    const iso = e.state?.sheet as string | undefined;
    if (iso) openSheet(iso, { push: false });
    else closeSheet({ pop: true });
  });
}
