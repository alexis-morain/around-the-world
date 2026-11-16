/* Accueil : film du jour, tirage au hasard avec amorce 3, 2, 1, carte, rangées « ma liste » et « vos soirées ». */
import { pickDaily, titleLen } from "../lib/logic";
import { all, has, onChange, toggle } from "./store";
import { announce, reduced, str } from "./ui";
import { openSheet, onSheet } from "./sheet";

interface Chip { kind: string; label: string; value: string }
interface IFilm {
  iso: string; ccn3: string; ll: [number, number] | null; name: string; lvl: string; title: string; local: string; year: string;
  lang: string; meta: string[]; poster: string; backdrop: string; tone: number; ov: string; ovl: string; ratings: Chip[]; trailer: string;
}

const el = (tag: string, cls?: string, text?: string) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

export function initHome() {
  const data = JSON.parse(document.getElementById("index")!.textContent!) as { films: IFilm[]; pool: string[] };
  const films = data.films;
  const byIso = new Map(films.map((f) => [f.iso, f]));
  const withFilm = films.filter((f) => f.title);
  let shown = (document.querySelector("[data-bb-open]") as HTMLElement).dataset.iso!;
  let map: typeof import("./map") | null = null;

  /* ---------- Billboard ---------- */
  const bbList = document.querySelector<HTMLButtonElement>("[data-bb-list]")!;
  const syncList = () => {
    const on = has("list", shown);
    bbList.setAttribute("aria-pressed", String(on));
    bbList.setAttribute("aria-label", str(on ? "inList" : "addList"));
  };
  bbList.addEventListener("click", () => toggle("list", shown));

  function render(f: IFilm, kicker: string, animate: boolean) {
    shown = f.iso;
    const art = document.getElementById("bb-art")!;
    art.className = f.backdrop ? "bb-art" : "bb-art no-art";
    art.replaceChildren();
    if (f.backdrop) {
      const img = new Image(1280, 720);
      img.src = f.backdrop; img.alt = ""; img.fetchPriority = "high";
      art.append(img);
    } else if (f.poster) {
      const wrap = el("span", "bb-typo"); const ci = el("span", "card-img");
      const img = new Image(342, 513); img.src = f.poster; img.alt = "";
      ci.append(img); wrap.append(ci); art.append(wrap);
    }
    const body = document.getElementById("bb-body")!;
    body.querySelector("[data-bb-kicker]")!.textContent = kicker;
    body.querySelector(".bb-kicker b")!.textContent = f.name;
    const h = body.querySelector<HTMLElement>("#bb-title")!;
    h.textContent = f.local;
    h.dataset.len = titleLen(f.local);
    let loc = body.querySelector(".bb-local");
    if (f.local !== f.title) {
      if (!loc) { loc = el("p", "bb-local"); body.querySelector("#bb-title")!.after(loc); }
      loc.textContent = f.title; (loc as HTMLElement).lang = f.lang;
    } else loc?.remove();
    body.querySelector(".bb-meta")!.replaceChildren(...f.meta.map((m) => el("span", "", m)));
    const rWrap = body.querySelector(".bb-meta")!.nextElementSibling!;
    rWrap.replaceChildren();
    if (f.ratings.length) {
      const ul = el("ul", "ratings");
      for (const r of f.ratings) {
        const li = el("li", "rating"); li.append(el("span", "rating-src", r.label), el("span", "rating-val", r.value)); ul.append(li);
      }
      rWrap.append(ul);
    }
    const ov = body.querySelector<HTMLElement>(".bb-ov")!;
    ov.textContent = f.ov;
    ov.lang = f.ovl;
    const open = body.querySelector<HTMLAnchorElement>("[data-bb-open]")!;
    open.dataset.iso = f.iso;
    open.href = open.href.replace(/film\/[a-z]+\/$/, `film/${f.iso.toLowerCase()}/`);
    syncList();
    if (animate && !reduced()) { body.classList.remove("bb-swap"); void body.offsetWidth; body.classList.add("bb-swap"); }
    map?.setCurrent(f.iso);
  }

  const dailyIso = pickDaily(data.pool, all("seen"), new Date());
  if (dailyIso && dailyIso !== shown) render(byIso.get(dailyIso)!, str("daily"), false);
  syncList();

  /* ---------- Tirage ---------- */
  let rolling = false;
  const btn = document.getElementById("random")!;
  btn.addEventListener("click", () => {
    if (rolling) return;
    const pool = withFilm.filter((f) => !has("seen", f.iso) && f.iso !== shown);
    const list = pool.length ? pool : withFilm;
    const pick = () => list[Math.floor(Math.random() * list.length)];
    const target = pick();
    const done = () => {
      render(target, str("drawn"), true);
      map?.focusCountry(target.iso);
      announce(`${target.name} : ${target.local}`);
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
  const io = new IntersectionObserver(async (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    map = await import("./map");
    const nameToIso = { Kosovo: "XK", Somaliland: "SO", "N. Cyprus": "CY" };
    await map.drawMap(films, nameToIso, (iso, from) => openSheet(iso, { from: from as HTMLElement }));
    map.setCurrent(shown);
  }, { rootMargin: "400px" });
  io.observe(screen);
  onSheet((iso) => map?.setCurrent(iso ?? shown));

  /* ---------- Rangées remplies dans le navigateur ---------- */
  const source = (iso: string) => document.querySelector<HTMLAnchorElement>(`.rows .row:not([data-client-row]) a.card[data-iso="${iso}"]`);
  function fillClientRows() {
    document.querySelectorAll<HTMLElement>("[data-client-row]").forEach((row) => {
      const name = row.dataset.clientRow as "list" | "seen";
      const ids = [...all(name)].reverse().filter((iso) => byIso.get(iso)?.title);
      const track = row.querySelector(".track")!;
      track.replaceChildren(...ids.map((iso) => {
        const li = document.createElement("li");
        const c = source(iso);
        if (c) li.append(c.cloneNode(true));
        return li;
      }));
      row.querySelector(".n")!.textContent = ids.length ? String(ids.length) : "";
      row.hidden = ids.length === 0;
    });
    window.dispatchEvent(new Event("rails:update"));
  }
  fillClientRows();
  onChange(() => { fillClientRows(); syncList(); map?.paintMap(); });

  // liens anciens : /#FR ouvre la fiche
  const hash = location.hash.slice(1).toUpperCase();
  if (byIso.get(hash)?.title) { history.replaceState(null, "", location.pathname); openSheet(hash); }
}
