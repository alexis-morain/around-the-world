/* Point d'entrée : en-tête, thème, rangées, marques « vu » et « ma liste », puis le module de la page. */
import { all, onChange, storage } from "./store";
import { initSheet, openSheet, prefetch } from "./sheet";
import { bindFilm } from "./film";
import { str } from "./ui";

/* ---------- Thème ---------- */
const themeBtn = document.getElementById("theme")!;
const current = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
function applyTheme(theme: "light" | "dark", save = false) {
  document.documentElement.dataset.theme = theme;
  if (save) storage.set("ofpc.theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f4f0ea" : "#100d0c");
  themeBtn.setAttribute("aria-label", theme === "dark" ? themeBtn.dataset.light! : themeBtn.dataset.dark!);
}
applyTheme(current());
themeBtn.addEventListener("click", () => applyTheme(current() === "dark" ? "light" : "dark", true));
matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
  const s = storage.get("ofpc.theme");
  if (s !== "light" && s !== "dark") applyTheme(e.matches ? "light" : "dark");
});

/* ---------- En-tête : opaque dès qu'on quitte le haut de page ---------- */
const head = document.getElementById("masthead")!;
const onScroll = () => head.classList.toggle("solid", scrollY > 24);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Progression et marques sur les affiches ---------- */
const total = Number(document.body.dataset.total);
function paintMarks() {
  const seen = all("seen"), list = all("list");
  const n = [...seen].length;
  document.getElementById("progress")!.textContent = n ? str("progress").replace("{n}", String(n)).replace("{t}", String(total)) : "";
  document.querySelectorAll<HTMLElement>("a.card").forEach((a) => {
    a.classList.toggle("is-seen", seen.has(a.dataset.iso!));
    a.classList.toggle("in-list", list.has(a.dataset.iso!));
  });
}

/* ---------- Rangées : boutons précédent / suivant ---------- */
function bindRails() {
  document.querySelectorAll<HTMLElement>(".rail").forEach((rail) => {
    if (rail.dataset.bound) return;
    rail.dataset.bound = "1";
    const track = rail.querySelector<HTMLElement>(".track")!;
    const [prev, next] = rail.querySelectorAll<HTMLButtonElement>(".rail-btn");
    const sync = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    const page = (dir: number) => track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    prev.addEventListener("click", () => page(-1));
    next.addEventListener("click", () => page(1));
    track.addEventListener("scroll", sync, { passive: true });
    addEventListener("resize", sync);
    addEventListener("rails:update", sync);
    sync();
  });
}

/* ---------- Ouverture des fiches en modale (accueil et catalogue) ---------- */
const filmPage = !!document.querySelector("main > #film");
initSheet();
if (!filmPage) {
  document.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("a.card, a[data-bb-open]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openSheet(a.dataset.iso!, { from: a });
  });
  const warm = (e: Event) => {
    const a = (e.target as Element).closest?.<HTMLAnchorElement>("a.card, a[data-bb-open]");
    if (a) prefetch(a.dataset.iso!);
  };
  document.addEventListener("pointerover", warm, { passive: true });
  document.addEventListener("focusin", warm);
} else {
  bindFilm(document);
}

bindRails();
paintMarks();
onChange(paintMarks);
addEventListener("rails:update", paintMarks);

if (document.getElementById("billboard")) import("./home").then((m) => m.initHome());
if (document.getElementById("filters")) import("./catalogue").then((m) => m.initCatalogue());
