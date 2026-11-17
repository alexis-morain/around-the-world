/* Comportements de la fiche d'un pays : « vu » et « ma liste » par œuvre, bande-annonce du film, partage. Même code sur la page et dans la modale. */
import { has, toggle, onChange, type SetName } from "./store";
import { countryUrl, toast } from "./ui";

export function syncCountry(root: ParentNode) {
  const art = root.querySelector<HTMLElement>("#country");
  if (!art) return;
  let seen = 0;
  const works = art.querySelectorAll<HTMLElement>(".work[data-key]");
  works.forEach((w) => {
    const on = has("seen", w.dataset.key!);
    w.classList.toggle("is-seen", on);
    if (on) seen++;
  });
  art.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((b) => {
    const on = has(b.dataset.toggle as SetName, b.dataset.key!);
    b.setAttribute("aria-pressed", String(on));
    const lbl = b.querySelector<HTMLElement>("[data-label-on]");
    if (lbl) lbl.textContent = on ? lbl.dataset.labelOn! : lbl.dataset.labelOff!;
  });
  const prog = art.querySelector<HTMLElement>("[data-prog]");
  if (prog) prog.textContent = seen ? prog.dataset.tpl!.replace("{n}", String(seen)) : prog.dataset.tplZero!;
}

export function bindCountry(root: ParentNode) {
  const art = root.querySelector<HTMLElement>("#country");
  if (!art) return () => {};
  const iso = art.dataset.iso!;
  syncCountry(root);
  art.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((b) =>
    b.addEventListener("click", () => toggle(b.dataset.toggle as SetName, b.dataset.key!)));

  const film = art.querySelector<HTMLElement>('.work[data-kind="film"]');
  const box = film?.querySelector<HTMLElement>("[data-trailer-box]");
  const open = film?.querySelector<HTMLButtonElement>("[data-trailer-open]");
  const stop = () => {
    box?.querySelector("iframe")?.remove();
    box?.classList.remove("on");
  };
  open?.addEventListener("click", () => {
    if (!box || !film?.dataset.trailer) return;
    stop();
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(film.dataset.trailer)}?autoplay=1&rel=0&hl=${document.body.dataset.lang}`;
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
    const url = `${location.origin}${countryUrl(iso)}`;
    try { await navigator.clipboard.writeText(url); toast("copied"); }
    catch { window.prompt("", url); }
  });
  const off = onChange(() => syncCountry(root));
  return () => { stop(); off(); };
}
