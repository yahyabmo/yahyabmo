// The fractal of the day: a place on the edge of the Mandelbrot set, chosen from the date,
// rendered with smooth colouring and 2×2 supersampling, saved as a JPEG.
import jpeg from "jpeg-js";

const W = 1200, H = 480, SS = 2;

/** A small seeded generator, so the same day always gives the same place. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

/** Smooth iteration count, or -1 inside. */
function count(cr, ci, max) {
  let x = 0, y = 0, n = 0;
  while (n < max) {
    const xx = x * x, yy = y * y;
    if (xx + yy > 256) return n + 1 - Math.log2(Math.log2(xx + yy) / 2);
    y = 2 * x * y + ci;
    x = xx - yy + cr;
    n++;
  }
  return -1;
}

export const PALETTES = {
  Ember: ["#0b0306", "#3b0a12", "#8f1d0f", "#e0561a", "#ffb347", "#fff1c9", "#ffb347", "#8f1d0f"],
  Glacier: ["#020b1c", "#06294f", "#0f5c8f", "#47a3d3", "#c9eefc", "#ffffff", "#7cc6e8", "#0b3a66"],
  Aurora: ["#04060f", "#13204a", "#1f6f78", "#4fd1a1", "#e6ff9e", "#7cf0c8", "#2a7fa0", "#1a2a6c"],
  Classic: ["#000764", "#206bcb", "#edffff", "#ffaa00", "#7a2200", "#000764"],
  Orchid: ["#08040f", "#2d0b3d", "#7a1f6e", "#d94f9b", "#ffc2e2", "#fff5fb", "#c86bd8", "#3a1660"],
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function paint(stops, t) {
  const c = stops.map(hex), u = ((t % 1) + 1) % 1 * c.length, i = Math.floor(u), f = u - i;
  const a = c[i % c.length], b = c[(i + 1) % c.length], s = f * f * (3 - 2 * f);
  return a.map((v, k) => v + (b[k] - v) * s);
}

/** Find a place on the boundary whose picture holds enough structure. */
function choose(day) {
  const rand = rng(hash(day));
  for (let attempt = 0; attempt < 4000; attempt++) {
    const cr = -2.1 + 2.7 * rand(), ci = -1.2 + 1.2 * rand(); // the lower half: the set is symmetric
    const n = count(cr, ci, 3000);
    if (n < 150 || n < 0) continue;
    const depth = 2.3 + 7.2 * rand();
    const width = 3 * 10 ** -depth;
    const max = Math.round(Math.min(6000, 250 + 220 * depth * depth));
    // A rough preview: some inside, a wide spread of counts, no flat band.
    const pw = 90, ph = 36, vals = [];
    let inside = 0;
    for (let j = 0; j < ph; j++)
      for (let i = 0; i < pw; i++) {
        const v = count(cr + (i / pw - 0.5) * width, ci + (j / ph - 0.5) * width * (H / W), max);
        if (v < 0) inside++;
        else vals.push(Math.log(v + 1));
      }
    const fin = inside / (pw * ph);
    if (fin > 0.3 || vals.length < 600) continue;
    vals.sort((a, b) => a - b);
    const lo = vals[Math.floor(vals.length * 0.03)], hi = vals[Math.floor(vals.length * 0.97)];
    if (hi - lo < 1.1) continue;
    const names = Object.keys(PALETTES);
    return { cr, ci, width, max, lo, hi, palette: names[Math.floor(rand() * names.length)], cycles: 1.6 + 2.2 * rand(), attempt };
  }
  throw new Error("no place found");
}

/** JPEG keeps the daily commit near 200 KB, where a PNG of this detail weighs a megabyte. */
function encode(rgb) {
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = 255;
  }
  return jpeg.encode({ data: rgba, width: W, height: H }, 82).data;
}

export function fractalOfTheDay(day) {
  const p = choose(day);
  const stops = PALETTES[p.palette];
  const inside = [6, 6, 10];
  const rgb = Buffer.alloc(W * H * 3);
  const px = p.width / (W * SS);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const cr = p.cr + ((x * SS + sx + 0.5) - (W * SS) / 2) * px;
          const ci = p.ci + ((y * SS + sy + 0.5) - (H * SS) / 2) * px;
          const v = count(cr, ci, p.max);
          const c = v < 0 ? inside : paint(stops, ((Math.log(v + 1) - p.lo) / (p.hi - p.lo)) * p.cycles);
          r += c[0]; g += c[1]; b += c[2];
        }
      const o = (y * W + x) * 3, n = SS * SS;
      rgb[o] = r / n; rgb[o + 1] = g / n; rgb[o + 2] = b / n;
    }
  const digits = Math.max(6, Math.ceil(-Math.log10(p.width)) + 5);
  return {
    image: encode(rgb),
    info: {
      day,
      re: p.cr.toFixed(digits),
      // Image rows go down while the imaginary axis goes up: the picture shows the conjugate.
      im: (-p.ci).toFixed(digits),
      width: p.width,
      magnification: 3 / p.width,
      iterations: p.max,
      palette: p.palette,
    },
  };
}
