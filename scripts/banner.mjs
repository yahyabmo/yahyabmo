// The banner: a Python prompt that types the greeting, and five double pendulums that start
// a thousandth of a radian apart, integrated with RK4, then drift apart. One SVG per theme.
import { writeFileSync } from "node:fs";

const W = 1280, H = 380;
const FPS = 18, SECONDS = 22, FRAMES = FPS * SECONDS;
const PIVOT = [1010, 170], ROD = 82;

/** RK4 for the double pendulum with equal masses and lengths. */
function simulate(t1, t2) {
  const g = 9.81, dt = 1 / (FPS * 40);
  let s = [t1, t2, 0, 0];
  const f = ([a, b, wa, wb]) => {
    const d = a - b, den = 3 - Math.cos(2 * d);
    const aa = (-3 * g * Math.sin(a) - g * Math.sin(a - 2 * b) - 2 * Math.sin(d) * (wb * wb + wa * wa * Math.cos(d))) / den;
    const bb = (2 * Math.sin(d) * (2 * wa * wa + 2 * g * Math.cos(a) + wb * wb * Math.cos(d))) / den;
    return [wa, wb, aa, bb];
  };
  const add = (x, k, h) => x.map((v, i) => v + k[i] * h);
  const out = [];
  for (let n = 0; n < FRAMES; n++) {
    const [a, b] = s;
    const x1 = PIVOT[0] + ROD * Math.sin(a), y1 = PIVOT[1] + ROD * Math.cos(a);
    out.push([x1, y1, x1 + ROD * Math.sin(b), y1 + ROD * Math.cos(b)]);
    for (let k = 0; k < 40; k++) {
      const k1 = f(s), k2 = f(add(s, k1, dt / 2)), k3 = f(add(s, k2, dt / 2)), k4 = f(add(s, k3, dt));
      s = s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
  }
  return out;
}

const r = (v) => Math.round(v * 10) / 10;
const pendulums = [0, 1, 2, 3, 4].map((i) => simulate(2.35, 2.6 + i * 0.002));

const THEMES = {
  dark: {
    bg: "#0d1117", card: "#0f1520", border: "#21262d", muted: "#7d8590", ink: "#e6edf3", sub: "#9198a1",
    fn: "#d2a8ff", str: "#7ee787", punct: "#c9d1d9", prompt: "#6e7681", rod: "#30363d", pivot: "#8b949e",
    hues: ["#f778ba", "#79c0ff", "#ffa657", "#a5f3a5", "#d2a8ff"], glow: 0.55,
  },
  light: {
    bg: "#ffffff", card: "#f6f8fa", border: "#d0d7de", muted: "#6e7781", ink: "#1f2328", sub: "#59636e",
    fn: "#8250df", str: "#0a3069", punct: "#1f2328", prompt: "#8c959f", rod: "#afb8c1", pivot: "#57606a",
    hues: ["#bf3989", "#0969da", "#bc4c00", "#1a7f37", "#8250df"], glow: 0.25,
  },
};

const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', Menlo, Consolas, monospace";
const SANS = "-apple-system, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

function svg(t) {
  const code = [["print", t.fn], ["(", t.punct], ['"Hello World, I\'m Yahya"', t.str], [")", t.punct]];
  const size = 34, cw = size * 0.6, x0 = 70, prompt = ">>> ";
  const typed = code.map(([s]) => s).join("");
  const startX = x0 + prompt.length * cw;
  let x = startX;
  const spans = code.map(([s, c]) => {
    const el = `<text x="${r(x)}" y="150" fill="${c}" font-family="${MONO}" font-size="${size}" textLength="${r(s.length * cw)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${s.replace(/"/g, "&quot;")}</text>`;
    x += s.length * cw;
    return el;
  });
  const steps = typed.length, typeStart = 0.6, typeDur = 2.2;
  const widths = Array.from({ length: steps + 1 }, (_, i) => r(i * cw)).join(";");
  const cursorXs = Array.from({ length: steps + 1 }, (_, i) => r(startX + i * cw)).join(";");
  const done = typeStart + typeDur;

  const keyTimes = Array.from({ length: FRAMES }, (_, i) => (i / (FRAMES - 1)).toFixed(4)).join(";");
  const loop = `dur="${SECONDS}s" repeatCount="indefinite" calcMode="linear" keyTimes="${keyTimes}"`;
  const bobs = pendulums
    .map((p, i) => {
      const hue = t.hues[i];
      const v = (k) => p.map((q) => r(q[k])).join(";");
      // A comet tail: the last stretch of the lower bob's path.
      const pts = p.map((q) => [q[2], q[3]]);
      let len = 0;
      const cum = pts.map((q, j) => (j ? (len += Math.hypot(q[0] - pts[j - 1][0], q[1] - pts[j - 1][1])) : 0));
      const tail = 260;
      const offs = cum.map((c) => r(-(c - tail))).join(";");
      const d = "M" + pts.map((q) => `${r(q[0])} ${r(q[1])}`).join("L");
      return `<g>
  <path d="${d}" fill="none" stroke="${hue}" stroke-width="2" stroke-linecap="round" stroke-opacity="${0.35 + t.glow * 0.5}" stroke-dasharray="${tail} ${r(len + tail)}"${t.glow > 0.4 ? ' filter="url(#glow)"' : ""}>
    <animate attributeName="stroke-dashoffset" values="${offs}" ${loop}/>
  </path>
  <line x1="${PIVOT[0]}" y1="${PIVOT[1]}" stroke="${t.rod}" stroke-width="2" stroke-linecap="round"><animate attributeName="x2" values="${v(0)}" ${loop}/><animate attributeName="y2" values="${v(1)}" ${loop}/></line>
  <line stroke="${t.rod}" stroke-width="2" stroke-linecap="round"><animate attributeName="x1" values="${v(0)}" ${loop}/><animate attributeName="y1" values="${v(1)}" ${loop}/><animate attributeName="x2" values="${v(2)}" ${loop}/><animate attributeName="y2" values="${v(3)}" ${loop}/></line>
  <circle r="6" fill="${hue}"><animate attributeName="cx" values="${v(2)}" ${loop}/><animate attributeName="cy" values="${v(3)}" ${loop}/></circle>
</g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="print(&quot;Hello World, I'm Yahya&quot;), next to five double pendulums drifting apart">
<defs>
  <clipPath id="typed"><rect x="${r(startX)}" y="110" height="60" width="0"><animate attributeName="width" values="${widths}" begin="${typeStart}s" dur="${typeDur}s" calcMode="discrete" fill="freeze"/></rect></clipPath>
  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="halo" cx="${PIVOT[0]}" cy="${PIVOT[1] + 40}" r="230" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.hues[1]}" stop-opacity="${0.12 * (t.glow + 0.3)}"/><stop offset="1" stop-color="${t.hues[1]}" stop-opacity="0"/></radialGradient>
</defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="${t.card}" stroke="${t.border}"/>
<circle cx="34" cy="34" r="6" fill="#ff5f57"/><circle cx="54" cy="34" r="6" fill="#febc2e"/><circle cx="74" cy="34" r="6" fill="#28c840"/>
<text x="100" y="40" fill="${t.muted}" font-family="${MONO}" font-size="15">~/yahyabmo — python3</text>
<text x="${x0}" y="96" fill="${t.muted}" font-family="${MONO}" font-size="18"># the oldest program, for a new visitor</text>
<text x="${x0}" y="150" fill="${t.prompt}" font-family="${MONO}" font-size="${size}" xml:space="preserve">${prompt.replace(/>/g, "&gt;")}</text>
<g clip-path="url(#typed)">${spans.join("")}</g>
<rect x="${r(startX)}" y="122" width="${r(cw * 0.55)}" height="36" fill="${t.ink}">
  <animate attributeName="x" values="${cursorXs}" begin="${typeStart}s" dur="${typeDur}s" calcMode="discrete" fill="freeze"/>
  <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1s" repeatCount="indefinite"/>
</rect>
<g opacity="0">
  <animate attributeName="opacity" from="0" to="1" begin="${done + 0.3}s" dur="0.6s" fill="freeze"/>
  <text x="${x0}" y="214" fill="${t.ink}" font-family="${SANS}" font-size="50" font-weight="700">Hello World, I'm Yahya</text>
</g>
<g opacity="0">
  <animate attributeName="opacity" from="0" to="1" begin="${done + 0.9}s" dur="0.6s" fill="freeze"/>
  <text x="${x0}" y="266" fill="${t.sub}" font-family="${SANS}" font-size="22">Data Science &amp; AI Engineering student · ENSEIRB-MATMECA</text>
  <text x="${x0}" y="298" fill="${t.sub}" font-family="${SANS}" font-size="22">Data Analytics &amp; Machine Learning | Software Development</text>
  <text x="${x0}" y="344" fill="${t.muted}" font-family="${MONO}" font-size="15">↗ five pendulums, started 0.002 rad apart · RK4 · watch them disagree</text>
</g>
<circle cx="${PIVOT[0]}" cy="${PIVOT[1] + 30}" r="230" fill="url(#halo)"/>
${bobs}
<circle cx="${PIVOT[0]}" cy="${PIVOT[1]}" r="5" fill="${t.pivot}"/>
</svg>
`;
}

for (const [name, t] of Object.entries(THEMES)) {
  const out = svg(t);
  writeFileSync(new URL(`../assets/banner-${name}.svg`, import.meta.url), out);
  console.log(`banner-${name}.svg`, (out.length / 1024).toFixed(0), "KB");
}
