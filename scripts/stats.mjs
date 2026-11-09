// Numbers from the GitHub API, drawn as an SVG card for each theme: no outside service.
const USER = "yahyabmo";
const API = "https://api.github.com";

async function get(path) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": `${USER}-readme` };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(API + path, { headers });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const COLORS = {
  TypeScript: "#3178c6", Python: "#3572a5", C: "#6e7681", "C++": "#f34b7d", Java: "#b07219", JavaScript: "#f1e05a",
  TeX: "#3d6117", PHP: "#4f5d95", CSS: "#663399", HTML: "#e34c26", Shell: "#89e051", R: "#198ce7", GLSL: "#5686a5", Jinja: "#a52a22",
};
const SKIP = new Set(["Makefile", "Dockerfile", "Batchfile", "PowerShell"]);

export async function collect(now = new Date()) {
  const repos = (await get(`/users/${USER}/repos?per_page=100&type=owner`)).filter((r) => !r.fork && !r.private && r.name !== USER);
  const bytes = {};
  for (const r of repos) for (const [lang, n] of Object.entries(await get(`/repos/${USER}/${r.name}/languages`))) if (!SKIP.has(lang)) bytes[lang] = (bytes[lang] ?? 0) + n;
  const since = new Date(now - 30 * 864e5).toISOString().slice(0, 10);
  const recent = (await get(`/search/commits?q=author:${USER}+is:public+committer-date:>${since}&per_page=1`)).total_count;
  const total = (await get(`/search/commits?q=author:${USER}+is:public&per_page=1`)).total_count;
  const latest = [...repos].sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))[0];
  return {
    repos: repos.length,
    stars: repos.reduce((s, r) => s + r.stargazers_count, 0),
    commits: total,
    recent,
    bytes,
    latest: { name: latest.name, at: latest.pushed_at },
    stars_of: Object.fromEntries(repos.map((r) => [r.name.toLowerCase(), r.stargazers_count])),
  };
}

const THEMES = {
  dark: { card: "#0f1520", border: "#21262d", ink: "#e6edf3", muted: "#7d8590", track: "#21262d", accent: "#7ee787" },
  light: { card: "#f6f8fa", border: "#d0d7de", ink: "#1f2328", muted: "#59636e", track: "#eaeef2", accent: "#1a7f37" },
};
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";
const SANS = "-apple-system, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function statsSvg(s, theme) {
  const t = THEMES[theme];
  const W = 1280, H = 250;
  const sum = Object.values(s.bytes).reduce((a, b) => a + b, 0);
  const langs = Object.entries(s.bytes).sort((a, b) => b[1] - a[1]);
  const top = langs.slice(0, 8);
  const rest = langs.slice(8).reduce((a, [, n]) => a + n, 0);
  if (rest) top.push(["Other", rest]);
  const barX = 40, barW = 700;
  let x = barX;
  const segs = top
    .map(([l, n]) => {
      const w = (n / sum) * barW;
      const el = `<rect x="${x.toFixed(1)}" y="92" width="${Math.max(w - 2, 1).toFixed(1)}" height="14" rx="3" fill="${COLORS[l] ?? "#8b949e"}"></rect>`;
      x += w;
      return el;
    })
    .join("");
  const legend = top
    .map(([l, n], i) => {
      const lx = barX + (i % 3) * 240, ly = 140 + Math.floor(i / 3) * 30;
      return `<circle cx="${lx + 6}" cy="${ly - 5}" r="6" fill="${COLORS[l] ?? "#8b949e"}"/><text x="${lx + 20}" y="${ly}" fill="${t.ink}" font-family="${SANS}" font-size="16">${esc(l)} <tspan fill="${t.muted}">${((n / sum) * 100).toFixed(1)}%</tspan></text>`;
    })
    .join("");
  const nums = [
    [s.recent, "commits in the last 30 days"],
    [s.commits, "public commits"],
    [s.repos, "public repositories"],
  ]
    .map(([n, l], i) => `<text x="820" y="${86 + i * 52}" fill="${i === 0 ? t.accent : t.ink}" font-family="${SANS}" font-size="34" font-weight="700">${n}</text><text x="920" y="${80 + i * 52}" fill="${t.muted}" font-family="${SANS}" font-size="17">${l}</text>`)
    .join("");
  const when = new Date(s.latest.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Languages and activity of ${USER}">
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="${t.card}" stroke="${t.border}"/>
<text x="40" y="58" fill="${t.ink}" font-family="${SANS}" font-size="22" font-weight="600">Languages across my public repositories</text>
<rect x="${barX}" y="92" width="${barW}" height="14" rx="3" fill="${t.track}"/>${segs}${legend}
<line x1="780" y1="40" x2="780" y2="${H - 40}" stroke="${t.border}"/>
${nums}
<text x="820" y="${H - 30}" fill="${t.muted}" font-family="${MONO}" font-size="14">latest push · ${esc(s.latest.name)} · ${when}</text>
</svg>
`;
}
