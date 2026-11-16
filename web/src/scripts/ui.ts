/* Petits services partagés : textes, toast, annonces, mouvement réduit. */
type Strings = Record<string, string>;
let S: Strings | null = null;
export function str(k: string): string {
  S ??= JSON.parse(document.getElementById("strings")?.textContent || "{}");
  return S![k] ?? k;
}
export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const lang = () => (document.body.dataset.lang === "en" ? "en" : "fr") as "fr" | "en";

let tt: number | undefined;
export function toast(key: string) {
  const el = document.getElementById("toast")!;
  el.textContent = str(key);
  el.classList.add("on");
  clearTimeout(tt);
  tt = window.setTimeout(() => el.classList.remove("on"), 1800);
}
export function announce(text: string) {
  const el = document.getElementById("announce");
  if (el) el.textContent = text;
}
export const filmUrl = (iso: string) =>
  `${document.body.dataset.base}/${lang() === "en" ? "en/" : ""}film/${iso.toLowerCase()}/`;
