/* Suivi local : films vus et « ma liste ». Rien ne part vers un serveur. */
import { parseIdSet } from "../lib/logic";

const KEYS = { seen: "ofpc.seen", list: "ofpc.list" } as const;
export type SetName = keyof typeof KEYS;

const safe = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* stockage refusé */ } },
};
export const storage = safe;

const sets: Record<SetName, Set<string>> = { seen: parseIdSet(safe.get(KEYS.seen)), list: parseIdSet(safe.get(KEYS.list)) };
const listeners = new Set<() => void>();

export const has = (name: SetName, iso: string) => sets[name].has(iso);
export const all = (name: SetName) => sets[name];
export function toggle(name: SetName, iso: string, on = !sets[name].has(iso)) {
  on ? sets[name].add(iso) : sets[name].delete(iso);
  // la liste garde l'ordre d'ajout ; un film vu en sort
  if (name === "seen" && on) sets.list.delete(iso);
  safe.set(KEYS.seen, JSON.stringify([...sets.seen]));
  safe.set(KEYS.list, JSON.stringify([...sets.list]));
  listeners.forEach((fn) => fn());
}
export function onChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// un autre onglet a changé le suivi
window.addEventListener("storage", (e) => {
  if (e.key === KEYS.seen) sets.seen = parseIdSet(e.newValue);
  else if (e.key === KEYS.list) sets.list = parseIdSet(e.newValue);
  else return;
  listeners.forEach((fn) => fn());
});
