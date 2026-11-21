/* Carte d3 : un pays = ses trois œuvres. La couleur suit ce qui est vu pour le type choisi (film, livre, série ou tout). */
import { geoEqualEarth, geoPath, geoArea } from "d3-geo";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import "d3-transition";
import { feature } from "topojson-client";
import { mapState, focusBox, KINDS, type Box, type Kind, type MapMode } from "../lib/logic";
import type { ClientCountry } from "../lib/films";
import { all } from "./store";
import { reduced, str } from "./ui";

type MapFilm = ClientCountry;
const MICRO_AREA = 3e-4; // sous cette aire (stéradians), un pays reçoit un point

let g: any, svg: any, zb: ZoomBehavior<SVGSVGElement, unknown>, W = 0, H = 0;
let byIso = new Map<string, MapFilm>();
let pieces = new Map<string, Box[]>(); // boîtes projetées de chaque morceau de pays, pour le cadrage
let current: string | null = null;
let mode: MapMode = "film";
const kindsOf = (c: MapFilm) => KINDS.filter((k) => c.works[k]);

export async function drawMap(films: MapFilm[], nameToIso: Record<string, string>, onPick: (iso: string, el: Element) => void) {
  const status = document.getElementById("map-status")!;
  try {
    const world = await fetch(`${document.body.dataset.base}/data/world-50m.json`).then((r) => r.json());
    byIso = new Map(films.map((f) => [f.iso, f]));
    const el = document.getElementById("map") as unknown as SVGSVGElement;
    const box = el.getBoundingClientRect();
    W = box.width; H = box.height;
    svg = select(el).attr("viewBox", `0 0 ${W} ${H}`);
    const features = (feature(world, world.objects.countries) as any).features.filter((f: any) => f.properties.name !== "Antarctica");
    const byCcn3 = new Map(films.map((f) => [String(f.ccn3).padStart(3, "0"), f]));
    for (const ft of features) {
      const f = ft.id ? byCcn3.get(String(ft.id).padStart(3, "0")) : byIso.get(nameToIso[ft.properties.name]);
      ft.iso = f ? f.iso : null;
    }
    const projection = geoEqualEarth().fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" } as any);
    const path = geoPath(projection);
    g = svg.append("g");
    g.append("path").attr("class", "sphere").attr("d", path({ type: "Sphere" } as any));
    g.selectAll("path.country").data(features).join("path")
      .attr("class", "country").attr("d", path).attr("data-iso", (d: any) => d.iso || "")
      .on("mousemove", (e: MouseEvent, d: any) => tip(e, d.iso))
      .on("mouseleave", hideTip)
      .on("click", function (this: Element, _e: MouseEvent, d: any) { if (d.iso && kindsOf(byIso.get(d.iso)!).length) onPick(d.iso, this); });

    for (const ft of features) {
      if (!ft.iso || !ft.geometry) continue;
      const polys = ft.geometry.type === "MultiPolygon" ? ft.geometry.coordinates : [ft.geometry.coordinates];
      const list = pieces.get(ft.iso) || [];
      for (const c of polys) { const [[a, b], [cc, dd]] = path.bounds({ type: "Polygon", coordinates: c } as any); if (isFinite(a)) list.push([a, b, cc, dd]); }
      pieces.set(ft.iso, list);
    }
    const drawn = new Map<string, number>();
    for (const ft of features) if (ft.iso) drawn.set(ft.iso, (drawn.get(ft.iso) || 0) + geoArea(ft));
    const dots = films.filter((f) => f.ll && (drawn.get(f.iso) || 0) < MICRO_AREA);
    g.selectAll("circle.dot").data(dots).join("circle")
      .attr("class", "dot country").attr("r", 3).attr("data-iso", (f: MapFilm) => f.iso)
      .attr("cx", (f: MapFilm) => projection([f.ll![1], f.ll![0]])![0])
      .attr("cy", (f: MapFilm) => projection([f.ll![1], f.ll![0]])![1])
      .on("mousemove", (e: MouseEvent, f: MapFilm) => tip(e, f.iso))
      .on("mouseleave", hideTip)
      .on("click", function (this: Element, _e: MouseEvent, f: MapFilm) { if (kindsOf(f).length) onPick(f.iso, this); });

    zb = d3zoom<SVGSVGElement, unknown>().scaleExtent([1, 12]).translateExtent([[0, 0], [W, H]])
      .on("zoom", (e) => { g.attr("transform", e.transform); g.selectAll("circle.dot").attr("r", 3 / Math.sqrt(e.transform.k)); });
    svg.call(zb).on("dblclick.zoom", null);
    const d = () => (reduced() ? 0 : 260);
    document.getElementById("zoom-in")!.onclick = () => svg.transition().duration(d()).call(zb.scaleBy, 1.6);
    document.getElementById("zoom-out")!.onclick = () => svg.transition().duration(d()).call(zb.scaleBy, 1 / 1.6);
    document.getElementById("zoom-reset")!.onclick = () => svg.transition().duration(d()).call(zb.transform, zoomIdentity);
    status.hidden = true;
    paintMap();
  } catch {
    status.textContent = str("mapError");
  }
}

export function paintMap() {
  if (!g) return;
  const seen = all("seen");
  g.selectAll(".country").each(function (this: SVGElement, d: any) {
    const iso = d.iso ?? d.iso2 ?? (d as MapFilm).iso ?? null;
    const f = iso && byIso.get(iso);
    const cls = this.tagName === "circle" ? ["dot", "country"] : ["country"];
    const st = f ? mapState(mode, kindsOf(f), f.iso, seen) : { state: "none", seen: 0, of: 0 };
    if (st.state === "none") cls.push("none");
    else if (st.state === "seen") cls.push("seen", mode === "all" ? `s${st.seen}` : "s3");
    if (iso && iso === current) cls.push("current");
    this.setAttribute("class", cls.join(" "));
  });
  g.selectAll(".current").raise();
}

/** Le type d'œuvre qui colore la carte, et la légende qui va avec. */
export function setMode(m: MapMode) {
  mode = m;
  const key = document.getElementById("map-key");
  if (key) {
    const l = JSON.parse(key.dataset.labels || "{}");
    const swatch = (cls: string) => `<li><i class="sw ${cls}"></i>`;
    key.innerHTML = [
      `${swatch("")}${l.open}</li>`,
      ...(m === "all" ? [0, 1, 2].map((i) => `${swatch(`seen s${i + 1}`)}${l.some[i]}</li>`) : [`${swatch("seen s3")}${l.seen}</li>`]),
      `${swatch("none")}${l.none[m]}</li>`,
    ].join("");
  }
  paintMap();
}

export function setCurrent(iso: string | null) { current = iso; paintMap(); }
export function flash(iso: string | null) {
  g?.selectAll(".country").classed("flash", function (this: Element) { return !!iso && this.getAttribute("data-iso") === iso; });
}

/** Cadre le pays (fonctionne aussi pour les pays en plusieurs morceaux). */
export function focusCountry(iso: string) {
  if (!g) return;
  let boxes = pieces.get(iso) || [];
  if (!boxes.length) {
    const nodes = g.selectAll(".country").filter(function (this: Element) { return this.getAttribute("data-iso") === iso; }).nodes() as SVGGraphicsElement[];
    boxes = nodes.map((n) => { const b = n.getBBox(); return [b.x, b.y, b.x + b.width, b.y + b.height] as Box; });
  }
  const fb = focusBox(boxes, W);
  if (!fb) return;
  const [x0, y0, x1, y1] = fb;
  const k = Math.max(1, Math.min(6, 0.35 / Math.max((x1 - x0) / W, (y1 - y0) / H)));
  const t = zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  svg.transition().duration(reduced() ? 0 : 650).call(zb.transform, t);
}

function tip(e: MouseEvent, iso: string | null) {
  const f = iso && byIso.get(iso);
  const el = document.getElementById("tip")!;
  if (!f) return hideTip();
  const rect = document.getElementById("screen")!.getBoundingClientRect();
  el.innerHTML = "";
  const b = document.createElement("b"); b.textContent = f.name; el.append(b);
  const seen = all("seen");
  const kinds: Kind[] = mode === "all" ? KINDS : [mode];
  let any = false;
  for (const k of kinds) {
    const w = f.works[k];
    if (!w) continue;
    any = true;
    const line = document.createElement("span");
    line.className = "tip-line";
    line.textContent = `${w.title}${w.year ? ` (${w.year.slice(0, 4)})` : ""}${seen.has(w.key) ? ` · ${str("mapSeen")}` : ""}`;
    el.append(line);
  }
  if (!any) { const n = document.createElement("span"); n.className = "tip-line"; n.textContent = (JSON.parse(document.getElementById("map-key")?.dataset.labels || "{}").none || {})[mode] || ""; el.append(n); }
  el.hidden = false;
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  el.style.left = `${Math.max(6, Math.min(x + 14, rect.width - el.offsetWidth - 6))}px`;
  el.style.top = `${Math.max(y - el.offsetHeight - 12, 6)}px`;
}
function hideTip() { const el = document.getElementById("tip"); if (el) el.hidden = true; }
