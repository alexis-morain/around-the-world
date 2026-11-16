/* Comportements de la fiche d'un film : vu, ma liste, bande-annonce, partage. Même code sur la page et dans la modale. */
import { has, toggle, onChange, type SetName } from "./store";
import { toast } from "./ui";

export function syncFilm(root: ParentNode) {
  const art = root.querySelector<HTMLElement>("#film");
  if (!art) return;
  const iso = art.dataset.iso!;
  art.classList.toggle("is-seen", has("seen", iso));
  art.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((b) => {
    const on = has(b.dataset.toggle as SetName, iso);
    b.setAttribute("aria-pressed", String(on));
    const lbl = b.querySelector<HTMLElement>("[data-label-on]");
    if (lbl) lbl.textContent = on ? lbl.dataset.labelOn! : lbl.dataset.labelOff!;
  });
}

export function bindFilm(root: ParentNode) {
  const art = root.querySelector<HTMLElement>("#film");
  if (!art) return () => {};
  const iso = art.dataset.iso!;
  syncFilm(root);
  art.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((b) =>
    b.addEventListener("click", () => toggle(b.dataset.toggle as SetName, iso)));

  const box = art.querySelector<HTMLElement>("[data-trailer-box]");
  const open = art.querySelector<HTMLButtonElement>("[data-trailer-open]");
  const stop = () => {
    box?.querySelector("iframe")?.remove();
    box?.classList.remove("on");
  };
  open?.addEventListener("click", () => {
    if (!box || !art.dataset.trailer) return;
    stop();
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(art.dataset.trailer)}?autoplay=1&rel=0&hl=${document.body.dataset.lang}`;
    f.title = open.textContent?.trim() || "Trailer";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    box.appendChild(f);
    box.classList.add("on");
    box.querySelector<HTMLElement>("[data-trailer-close]")?.focus();
    box.scrollIntoView({ block: "nearest" });
  });
  box?.querySelector("[data-trailer-close]")?.addEventListener("click", () => { stop(); open?.focus(); });

  art.querySelector("[data-share]")?.addEventListener("click", async () => {
    const lang = document.body.dataset.lang === "en" ? "en/" : "";
    const url = `${location.origin}${document.body.dataset.base}/${lang}film/${iso.toLowerCase()}/`;
    try { await navigator.clipboard.writeText(url); toast("copied"); }
    catch { window.prompt("", url); }
  });
  const off = onChange(() => syncFilm(root));
  return () => { stop(); off(); };
}
