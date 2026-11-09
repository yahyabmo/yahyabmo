// Rebuild README.md from template.md: the fractal of the day, the numbers, the stars.
import { readFileSync, writeFileSync } from "node:fs";
import { fractalOfTheDay } from "./fractal.mjs";
import { collect, statsSvg } from "./stats.mjs";

const root = new URL("../", import.meta.url);
const now = new Date();
const day = now.toISOString().slice(0, 10);

const f = fractalOfTheDay(day);
writeFileSync(new URL("assets/fractal.jpg", root), f.image);

const s = await collect(now);
for (const theme of ["dark", "light"]) writeFileSync(new URL(`assets/stats-${theme}.svg`, root), statsSvg(s, theme));

const big = (x) => {
  const e = Math.floor(Math.log10(x));
  return e < 6 ? Math.round(x).toLocaleString("en-US") : `${(x / 10 ** e).toFixed(1)} × 10<sup>${e}</sup>`;
};
const values = {
  day,
  built: `${day} at ${now.toISOString().slice(11, 16)} UTC`,
  "fractal.re": f.info.re,
  "fractal.im": f.info.im,
  "fractal.zoom": big(f.info.magnification),
  "fractal.iterations": f.info.iterations.toLocaleString("en-US"),
  "fractal.palette": f.info.palette,
  "fractal.link": `http://localhost:5191/#re=${f.info.re}&im=${f.info.im}&w=${f.info.width.toExponential(6)}`,
};
const template = readFileSync(new URL("template.md", root), "utf8");
const readme = template.replace(/\{\{([\w.:-]+)\}\}/g, (m, key) => {
  if (key.startsWith("stars:")) return String(s.stars_of[key.slice(6)] ?? 0);
  if (!(key in values)) throw new Error(`unknown placeholder ${m}`);
  return values[key];
});
writeFileSync(new URL("README.md", root), readme);
console.log(`README built for ${day}: fractal ×${f.info.magnification.toExponential(1)} (${f.info.palette}), ${s.recent} commits in 30 days`);
