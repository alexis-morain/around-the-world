/*
  Modale de fiche : charge l'<article> de la page /pays/<iso>/ et l'affiche par-dessus l'accueil ou le catalogue.
  L'URL devient celle de la fiche (partageable), « retour » ferme la modale.
*/
import { bindCountry } from "./country";
import { countryUrl, reduced, announce } from "./ui";

const cache = new Map<string, Promise<string>>();
function load(iso: string) {
  if (!cache.has(iso)) {
    const p = fetch(countryUrl(iso)).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    }).then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const art = doc.getElementById("country")!;
      art.querySelector("[data-near]")?.remove();
      // dans la modale, la page n'a pas de h1 : chaque titre descend d'un niveau
      for (const n of [3, 2, 1]) {
        art.querySelectorAll(`h${n}`).forEach((h) => {
          const next = doc.createElement(`h${n + 1}`);
          for (const a of h.attributes) next.setAttribute(a.name, a.value);
          next.append(...h.childNodes);
          h.replaceWith(next);
        });
      }
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

export async function openSheet(iso: string, { push = true, from, kind }: { push?: boolean; from?: HTMLElement | null; kind?: string } = {}) {
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
  if (push) history.pushState({ sheet: iso, kind }, "", countryUrl(iso) + (kind ? `#work-${kind}` : ""));
  listeners.forEach((fn) => fn(iso));
  try {
    const html = await load(iso);
    if (currentIso !== iso) return;
    unbind();
    body.innerHTML = html;
    unbind = bindCountry(body);
    sheet.scrollTop = 0;
    if (kind) body.querySelector<HTMLElement>(`#work-${kind}`)?.scrollIntoView({ block: "start" });
    const title = body.querySelector("#country-title")?.textContent || "";
    document.title = `${title} · ${document.querySelector(".brand-name")?.textContent}`;
    announce(title);
  } catch {
    location.href = countryUrl(iso); // la page complète, sans modale
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
    if (iso) openSheet(iso, { push: false, kind: e.state?.kind });
    else closeSheet({ pop: true });
  });
}
