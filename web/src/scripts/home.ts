/* Accueil : pays du jour et tirage au hasard (amorce 3, 2, 1), carte, rangées « ma liste » et « vos soirées passées ». */
import { completedCountries, nameLen, pickDaily, KINDS, type Kind } from "../lib/logic";
import { cardHtml, trioHtml } from "../lib/cards";
import type { ClientCountry } from "../lib/films";
import { all, onChange } from "./store";
import { announce, lang, reduced, str } from "./ui";
import { openSheet, onSheet } from "./sheet";

const availOf = (c: ClientCountry) => KINDS.filter((k) => c.works[k]);

export function initHome() {
  const data = JSON.parse(document.getElementById("index")!.textContent!) as { countries: ClientCountry[]; pool: string[]; continents: Record<string, string> };
  const L = lang();
  const countries = data.countries;
  const byIso = new Map(countries.map((c) => [c.iso, c]));
  const withWorks = countries.filter((c) => availOf(c).length);
  const avail = Object.fromEntries(withWorks.map((c) => [c.iso, availOf(c)]));
  let shown = (document.getElementById("hero-open") as HTMLElement).dataset.iso!;
  let map: typeof import("./map") | null = null;

  /* ---------- Pays du jour ---------- */
  function render(c: ClientCountry, kicker: string, animate: boolean) {
    shown = c.iso;
    const text = document.getElementById("hero-text")!;
    text.querySelector("[data-hero-kicker]")!.textContent = kicker;
    const h = document.getElementById("hero-title")!;
    h.textContent = c.name;
    h.dataset.len = nameLen(c.name);
    document.getElementById("hero-sub")!.textContent = data.continents[c.continent] || "";
    const open = document.getElementById("hero-open") as HTMLAnchorElement;
    open.dataset.iso = c.iso;
    const first = Object.values(c.works)[0];
    if (first) open.href = first.href;
    document.getElementById("trio")!.innerHTML = trioHtml(c, L);
    document.dispatchEvent(new Event("marks:update"));
    if (animate && !reduced()) {
      for (const el of [text, document.getElementById("trio")!]) { el.classList.remove("bb-swap"); void el.offsetWidth; el.classList.add("bb-swap"); }
    }
    map?.setCurrent(c.iso);
  }

  const daily = pickDaily(data.pool, completedCountries(avail, all("seen")), new Date());
  if (daily && daily !== shown) render(byIso.get(daily)!, str("daily"), false);

  /* ---------- Tirage ---------- */
  let rolling = false;
  const btn = document.getElementById("random")!;
  btn.addEventListener("click", () => {
    if (rolling) return;
    const done0 = completedCountries(avail, all("seen"));
    const open = withWorks.filter((c) => !done0.has(c.iso) && c.iso !== shown);
    const list = open.length ? open : withWorks;
    const pick = () => list[Math.floor(Math.random() * list.length)];
    const target = pick();
    const done = () => {
      render(target, str("drawn"), true);
      map?.focusCountry(target.iso);
      announce(target.name);
    };
    if (document.hidden || reduced()) return done();
    rolling = true;
    btn.setAttribute("aria-disabled", "true");
    const leader = document.getElementById("leader")!, num = document.getElementById("leader-num")!;
    leader.hidden = false; void leader.offsetWidth; leader.classList.add("on");
    const beat = 450, t0 = performance.now();
    const delays = [60, 60, 70, 85, 100, 125, 150, 190, 230, 280];
    let i = 0, timer = 0, raf = 0;
    const frame = (now: number) => {
      const e = Math.max(0, now - t0), k = Math.min(2, Math.floor(e / beat)), p = Math.min(1, (e - k * beat) / beat);
      num.textContent = String(3 - k);
      leader.querySelector<HTMLElement>(".leader-disc")!.style.setProperty("--sweep", `${p * 360}deg`);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const finish = () => {
      if (!rolling) return;
      clearTimeout(timer); cancelAnimationFrame(raf); map?.flash(null);
      leader.classList.remove("on"); setTimeout(() => { leader.hidden = true; }, 220);
      rolling = false; btn.removeAttribute("aria-disabled");
      document.removeEventListener("visibilitychange", finish);
      done();
    };
    // onglet masqué : les minuteries tombent à 1 s, on conclut tout de suite
    document.addEventListener("visibilitychange", finish);
    const step = () => {
      if (i < delays.length) { map?.flash(pick().iso); timer = window.setTimeout(step, delays[i++]); return; }
      finish();
    };
    step();
  });

  /* ---------- Carte, chargée quand elle approche de l'écran ---------- */
  const screen = document.getElementById("screen")!;
  let mode: Kind | "all" = "film";
  const io = new IntersectionObserver(async (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    map = await import("./map");
    const nameToIso = { Kosovo: "XK", Somaliland: "SO", "N. Cyprus": "CY" };
    await map.drawMap(countries, nameToIso, (iso, from) => openSheet(iso, { from: from as HTMLElement }));
    map.setMode(mode);
    map.setCurrent(shown);
  }, { rootMargin: "400px" });
  io.observe(screen);
  onSheet((iso) => map?.setCurrent(iso ?? shown));
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.mode as Kind | "all";
    document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    map?.setMode(mode);
  }));

  /* ---------- Rangées remplies dans le navigateur ---------- */
  function fillClientRows() {
    document.querySelectorAll<HTMLElement>("[data-client-row]").forEach((row) => {
      const name = row.dataset.clientRow as "list" | "seen";
      const keys = [...all(name)].reverse().filter((k) => {
        const [kind, iso] = k.split(":");
        return !!byIso.get(iso)?.works[kind as Kind];
      });
      const track = row.querySelector(".track")!;
      track.replaceChildren(...keys.map((k) => {
        const [kind, iso] = k.split(":");
        const li = document.createElement("li");
        li.innerHTML = cardHtml(byIso.get(iso)!.works[kind as Kind]!, L, { mixed: true });
        return li;
      }));
      row.querySelector(".n")!.textContent = keys.length ? String(keys.length) : "";
      row.hidden = keys.length === 0;
    });
    window.dispatchEvent(new Event("rails:update"));
  }
  fillClientRows();
  onChange(() => { fillClientRows(); map?.paintMap(); });

  // liens anciens : /#FR ouvre la fiche du pays
  const hash = location.hash.slice(1).toUpperCase();
  if (byIso.get(hash) && availOf(byIso.get(hash)!).length) { history.replaceState(null, "", location.pathname); openSheet(hash); }
}
