/* Suivi local : œuvres vues et « ma liste », par clé « film:FR », « book:FR », « series:FR ». Rien ne part vers un serveur. */
import { loadTracking, parseIdSet } from "../lib/logic";

const KEYS = { seen: "atw.seen", list: "atw.list" } as const;
/** Ancien stockage (site « Un film par pays ») : des codes pays de films, repris une fois. */
const LEGACY = { seen: "ofpc.seen", list: "ofpc.list" } as const;
export type SetName = keyof typeof KEYS;

const safe = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* stockage refusé */ } },
};
export const storage = safe;

const sets: Record<SetName, Set<string>> = {
  seen: loadTracking(safe.get(KEYS.seen), safe.get(LEGACY.seen)),
  list: loadTracking(safe.get(KEYS.list), safe.get(LEGACY.list)),
};
const persist = () => { safe.set(KEYS.seen, JSON.stringify([...sets.seen])); safe.set(KEYS.list, JSON.stringify([...sets.list])); };
// la reprise des anciennes clés est écrite tout de suite : elle ne se refait plus
if (safe.get(KEYS.seen) === null && safe.get(LEGACY.seen) !== null) persist();
const listeners = new Set<() => void>();

export const has = (name: SetName, key: string) => sets[name].has(key);
export const all = (name: SetName) => sets[name];
export function toggle(name: SetName, key: string, on = !sets[name].has(key)) {
  on ? sets[name].add(key) : sets[name].delete(key);
  // la liste garde l'ordre d'ajout ; une œuvre vue en sort
  if (name === "seen" && on) sets.list.delete(key);
  persist();
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
