import { chromium } from "playwright";
const B = "https://aroundtheworld.morain.fr/";
const out = process.argv[2];
const b = await chromium.launch();
async function pg(vp, scheme = "dark", dsf = 1.5) {
  const c = await b.newContext({ viewport: vp, colorScheme: scheme, deviceScaleFactor: dsf });
  return c.newPage();
}
const shot = (p, n) => p.screenshot({ path: out + n + ".jpg", type: "jpeg", quality: 78 });
const d = await pg({ width: 1280, height: 800 });
await d.goto(B, { waitUntil: "networkidle" }); await d.waitForTimeout(800);
await shot(d, "home");
await d.evaluate(() => document.querySelector(".map-section").scrollIntoView()); await d.waitForTimeout(1800);
await d.evaluate(() => scrollBy(0, -20)); await d.waitForTimeout(400);
await shot(d, "map");
await d.goto(B + "pays/kr/", { waitUntil: "networkidle" }); await d.waitForTimeout(800);
await shot(d, "country");
await d.goto(B + "catalogue/?tab=book", { waitUntil: "networkidle" }); await d.waitForTimeout(800);
await d.evaluate(() => scrollTo(0, 230)); await d.waitForTimeout(500);
await shot(d, "catalogue");
const l = await pg({ width: 1280, height: 800 }, "light");
await l.goto(B + "pays/eg/", { waitUntil: "networkidle" }); await l.evaluate(() => scrollTo(0, 380)); await l.waitForTimeout(600);
await shot(l, "country-light");
const m = await pg({ width: 390, height: 844 }, "dark", 2);
await m.goto(B, { waitUntil: "networkidle" }); await m.waitForTimeout(800);
await shot(m, "mobile");
await b.close();
