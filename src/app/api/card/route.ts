import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Go: "#00ADD8",
  Rust: "#dea584",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Shell: "#89e051",
  PowerShell: "#012456",
  Zig: "#ec915c",
  Solidity: "#AA6746",
  Lua: "#000080",
  R: "#198CE7",
  Scala: "#c22d40",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Clojure: "#db5855",
  Julia: "#a270ba",
  Perl: "#0298c3",
  CoffeeScript: "#244776",
  Erlang: "#B83998",
  OCaml: "#3be133",
  Nix: "#7e7eff",
  Docker: "#384d54",
  Dockerfile: "#384d54",
  GraphQL: "#e10098",
  Assembly: "#6E4C13",
  ObjectiveC: "#438eff",
  "Objective-C": "#438eff",
  Vim: "#199f4b",
  "Vim Script": "#199f4b",
  Roff: "#701516",
  Makefile: "#427819",
};

const LANG_ICON_SLUGS: Record<string, string> = {
  TypeScript: "typescript",
  JavaScript: "javascript",
  Python: "python",
  Java: "openjdk",
  "C++": "cplusplus",
  C: "c",
  "C#": "csharp",
  PHP: "php",
  Ruby: "ruby",
  Go: "go",
  Rust: "rust",
  Swift: "swift",
  Kotlin: "kotlin",
  Dart: "dart",
  HTML: "html5",
  CSS: "css3",
  SCSS: "sass",
  Vue: "vuedotjs",
  Svelte: "svelte",
  Shell: "gnubash",
  PowerShell: "powershell",
  Zig: "zig",
  Solidity: "solidity",
  Lua: "lua",
  R: "r",
  Scala: "scala",
  Elixir: "elixir",
  Haskell: "haskell",
  Clojure: "clojure",
  Julia: "julia",
  Perl: "perl",
  Erlang: "erlang",
  OCaml: "ocaml",
  Nix: "nixos",
  Docker: "docker",
  Dockerfile: "docker",
  GraphQL: "graphql",
  Assembly: "assemblyscript",
  ObjectiveC: "apple",
  "Objective-C": "apple",
  Vim: "vim",
  "Vim Script": "vim",
  Markdown: "markdown",
};

const localIconCache: Record<string, string> = {};

function sanitizeHex(input: string | null): string {
  if (!input) return "#89e051";
  const clean = input.startsWith("#") ? input : `#${input}`;
  return /^#[0-9a-fA-F]{6}$/.test(clean) ? clean : "#89e051";
}

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case "'": return "&apos;";
        case '"': return "&quot;";
        default: return c;
      }
    });
}

function formatBioLines(bio: string, maxCharsPerLine = 48, maxLines = 3): string[] {
  if (!bio) return [];
  const cleanBio = bio.replace(/[\r\n]+/g, " ").trim();
  const words = cleanBio.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const testLine = current ? `${current} ${word}` : word;
    if (testLine.length <= maxCharsPerLine) {
      current = testLine;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  const consumedChars = lines.join(" ").length;
  if (cleanBio.length > consumedChars && lines.length === maxLines) {
    const lastIdx = maxLines - 1;
    lines[lastIdx] = lines[lastIdx].length > maxCharsPerLine - 3
      ? lines[lastIdx].slice(0, maxCharsPerLine - 4).trim() + "..."
      : lines[lastIdx] + "...";
  }

  return lines.slice(0, maxLines);
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return num.toString();
}

function ghHeaders(token?: string): HeadersInit {
  const h: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GitHub-Profile-Card-Generator",
  };
  if (token) h.Authorization = `token ${token}`;
  return h;
}

function getLanguageColor(lang: string): string {
  if (LANG_COLORS[lang]) return LANG_COLORS[lang];
  let hash = 0;
  for (let i = 0; i < lang.length; i++) {
    hash = lang.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return `#${"00000".substring(0, 6 - c.length)}${c}`;
}

function getLanguageSlug(lang: string): string {
  if (LANG_ICON_SLUGS[lang]) return LANG_ICON_SLUGS[lang];
  return lang.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function renderLocalSvgIcon(lang: string, colorHex: string, x: number, y: number): string {
  const slug = getLanguageSlug(lang).toLowerCase();

  if (localIconCache[slug] === undefined) {
    try {
      const filePath = path.join(process.cwd(), "public", "icons", `${slug}.svg`);

      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");

        const viewBoxMatch = raw.match(/viewBox=["']([^"']+)["']/i);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";

        const innerMatch = raw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        let innerContent = innerMatch ? innerMatch[1] : "";

        innerContent = innerContent
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<!--[\s\S]*?-->/g, "");

        localIconCache[slug] = innerContent.trim()
          ? JSON.stringify({ viewBox, inner: innerContent })
          : "";
      } else {
        localIconCache[slug] = "";
      }
    } catch {
      localIconCache[slug] = "";
    }
  }

  const cached = localIconCache[slug];

  if (cached) {
    try {
      const { viewBox, inner } = JSON.parse(cached);
      return `<svg x="${x}" y="${y}" width="26" height="26" viewBox="${viewBox}" fill="${colorHex}"><g fill="${colorHex}">${inner}</g></svg>`.trim();
    } catch {}
  }

  return `<circle cx="${x + 13}" cy="${y + 13}" r="13" fill="${colorHex}" opacity="0.85"/><text x="${x + 13}" y="${y + 17}" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">${escapeXml(lang[0])}</text>`;
}

async function fetchAllTimeGraphQLStats(username: string, createdYear: number, token?: string) {
  if (!token) return { commits: 0, prs: 0, contribs: 0 };

  const currentYear = new Date().getFullYear();
  const startYear = Math.max(createdYear, currentYear - 8);
  const years: number[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    years.push(y);
  }

  const yearQueries = years
    .map(
      (y) => `
      y_${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") {
        totalCommitContributions
        restrictedContributionsCount
        totalPullRequestContributions
        totalIssueContributions
      }`
    )
    .join("\n");

  const query = `
    query($login: String!) {
      user(login: $login) {
        pullRequests { totalCount }
        ${yearQueries}
      }
    }
  `;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: ghHeaders(token),
      body: JSON.stringify({ query, variables: { login: username } }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!res.ok) return { commits: 0, prs: 0, contribs: 0 };
    const json = await res.json();
    const user = json.data?.user;
    if (!user) return { commits: 0, prs: 0, contribs: 0 };

    let totalCommits = 0;
    let totalContribs = 0;

    for (const y of years) {
      const c = user[`y_${y}`];
      if (c) {
        const cCommits = c.totalCommitContributions || 0;
        const cRestricted = c.restrictedContributionsCount || 0;
        const cPRs = c.totalPullRequestContributions || 0;
        const cIssues = c.totalIssueContributions || 0;

        totalCommits += cCommits;
        totalContribs += (cCommits + cRestricted + cPRs + cIssues);
      }
    }

    return {
      commits: totalCommits,
      prs: user.pullRequests?.totalCount || 0,
      contribs: totalContribs,
    };
  } catch {
    return { commits: 0, prs: 0, contribs: 0 };
  }
}

async function fetchRepoDataAndLanguages(username: string, token?: string) {
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=pushed`,
      {
        headers: ghHeaders(token),
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      }
    );

    if (!res.ok) return { totalStars: 0, totalForks: 0, languages: [] };
    const repos = await res.json();
    if (!Array.isArray(repos)) return { totalStars: 0, totalForks: 0, languages: [] };

    let totalStars = 0;
    let totalForks = 0;
    const langScores: Record<string, number> = {};

    for (const r of repos) {
      totalStars += Number(r.stargazers_count || 0);
      totalForks += Number(r.forks_count || 0);

      if (r.language) {
        const weight = Math.max(10, Math.min(Number(r.size || 10), 5000));
        langScores[r.language] = (langScores[r.language] || 0) + weight;
      }
    }

    const sorted = Object.entries(langScores).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = sorted.reduce((acc, [, val]) => acc + val, 0) || 1;

    const languages = sorted.map(([lang, val]) => {
      const pct = Math.round((val / sum) * 100);
      return [lang, pct] as [string, number];
    });

    return { totalStars, totalForks, languages };
  } catch {
    return { totalStars: 0, totalForks: 0, languages: [] };
  }
}

function renderErrorSvg(msg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 200" width="480" height="200">
    <rect width="100%" height="100%" rx="16" fill="#09090b" stroke="#27272a" stroke-width="1.5"/>
    <text x="50%" y="45%" fill="#ef4444" font-size="17" font-weight="700" font-family="-apple-system,Segoe UI,sans-serif" text-anchor="middle">GitHub Connection Timeout</text>
    <text x="50%" y="65%" fill="#a1a1aa" font-size="13" font-family="-apple-system,Segoe UI,sans-serif" text-anchor="middle">${escapeXml(msg)}</text>
  </svg>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") || "Erfan-Asadi";
  const glowHex = sanitizeHex(searchParams.get("glow"));
  const token = process.env.GITHUB_TOKEN;

  let user: any;
  try {
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: ghHeaders(token),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!userRes.ok) {
      const msg = userRes.status === 403 ? "Rate limit reached. Token required." : "User not found.";
      return new Response(renderErrorSvg(msg), {
        status: 200,
        headers: { "Content-Type": "image/svg+xml" },
      });
    }
    user = await userRes.json();
  } catch {
    return new Response(renderErrorSvg("GitHub API unreachable or timed out."), {
      status: 200,
      headers: { "Content-Type": "image/svg+xml" },
    });
  }

  const createdYear = new Date(user.created_at).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsOnGitHub = Math.max(1, currentYear - createdYear);

  const [extraStats, repoData] = await Promise.all([
    fetchAllTimeGraphQLStats(username, createdYear, token),
    fetchRepoDataAndLanguages(username, token),
  ]);

  const W = 480;
  const H = 640;
  const pad = 36;

  const rawName = user.name || user.login;
  const name = escapeXml(rawName);
  const maxNameWidth = W - pad * 2 - 150;
  const nameFontSize = 28;
  const approxCharW = nameFontSize * 0.55;
  const needsShrink = rawName.length * approxCharW > maxNameWidth;
  const nameTextAttrs = needsShrink
    ? `textLength="${maxNameWidth}" lengthAdjust="spacingAndGlyphs"`
    : "";

  const rawBio = (user.bio || "").trim();
  const bioLines = formatBioLines(rawBio, 48, 3);
  
  let bioSvg = "";
  if (bioLines.length === 1) {
    bioSvg = `<text x="${pad}" y="136" font-size="13" fill="#a1a1aa" font-family="-apple-system,Segoe UI,sans-serif">${escapeXml(bioLines[0])}</text>`;
  } else if (bioLines.length === 2) {
    bioSvg = `
      <text x="${pad}" y="128" font-size="12.5" fill="#a1a1aa" font-family="-apple-system,Segoe UI,sans-serif">${escapeXml(bioLines[0])}</text>
      <text x="${pad}" y="146" font-size="12.5" fill="#a1a1aa" font-family="-apple-system,Segoe UI,sans-serif">${escapeXml(bioLines[1])}</text>
    `;
  } else if (bioLines.length === 3) {
    bioSvg = `
      <text x="${pad}" y="122" font-size="12" fill="#a1a1aa" font-family="-apple-system,Segoe UI,sans-serif">${escapeXml(bioLines[0])}</text>
      <text x="${pad}" y="139" font-size="12" fill="#a1a1aa" font-family="-apple-system,Segoe UI,sans-serif">${escapeXml(bioLines[1])}</text>
      <text x="${pad}" y="156" font-size="12" fill="#a1a1aa" font-family="-apple-system,Segoe UI,sans-serif">${escapeXml(bioLines[2])}</text>
    `;
  }

  const rng = seededRandom(1337);
  const stars = Array.from({ length: 32 }, () => {
    const cx = Math.round(200 + rng() * 260);
    const cy = Math.round(15 + rng() * 220);
    const r = (0.7 + rng() * 1.6).toFixed(1);
    const op = (0.2 + rng() * 0.7).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" opacity="${op}"/>`;
  }).join("\n      ");

  const statItems: [string, string][] = [
    ["Stars", formatNumber(repoData.totalStars)],
    ["Forks", formatNumber(repoData.totalForks)],
    ["Commits", formatNumber(extraStats.commits)],
    ["PRs", formatNumber(extraStats.prs)],
    ["Contribs", formatNumber(extraStats.contribs)],
  ];

  const statCols = statItems
    .map(([label, val], idx) => {
      const x = idx < 3 ? pad + idx * 140 : pad + (idx - 3) * 140;
      const y = idx < 3 ? 232 : 302;

      return `
        <g>
          <text x="${x}" y="${y}" font-size="13" font-weight="600" fill="#71717a" letter-spacing="0.5" font-family="-apple-system,Segoe UI,sans-serif">${label}</text>
          <text x="${x}" y="${y + 32}" font-size="25" font-weight="700" fill="#ffffff" font-family="-apple-system,Segoe UI,sans-serif">${val}</text>
        </g>`;
    })
    .join("");

  const langStartY = 392;
  const langRowH = 58;
  const langRows = repoData.languages
    .map(([lang, pct], i) => {
      const y = langStartY + i * langRowH;
      const color = getLanguageColor(lang);
      const barX = pad + 40;
      const trackW = W - barX - pad;
      const barW = Math.max(8, Math.round((trackW * pct) / 100));
      const iconGraphic = renderLocalSvgIcon(lang, color, pad, y + 3);

      return `
        <g>
          ${iconGraphic}
          <text x="${barX}" y="${y + 4}" font-size="12.5" font-weight="600" fill="#a1a1aa" letter-spacing="0.3" font-family="-apple-system,Segoe UI,sans-serif">${escapeXml(lang)}</text>
          <text x="${W - pad}" y="${y + 4}" font-size="12.5" font-weight="600" fill="#a1a1aa" text-anchor="end" font-family="-apple-system,Segoe UI,sans-serif">${pct}%</text>
          <rect x="${barX}" y="${y + 12}" width="${trackW}" height="9" rx="4.5" fill="#ffffff" opacity="0.08"/>
          <rect x="${barX}" y="${y + 12}" width="${barW}" height="9" rx="4.5" fill="${color}"/>
        </g>`;
    })
    .join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c1017"/>
      <stop offset="100%" stop-color="#05070a"/>
    </linearGradient>

    <radialGradient id="glowGrad" cx="95%" cy="5%" r="70%">
      <stop offset="0%" stop-color="${glowHex}" stop-opacity="0.55"/>
      <stop offset="50%" stop-color="${glowHex}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${glowHex}" stop-opacity="0"/>
    </radialGradient>

    <clipPath id="cardClip">
      <rect width="${W}" height="${H}" rx="28"/>
    </clipPath>
  </defs>

  <g clip-path="url(#cardClip)">
    <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
    <rect width="${W}" height="${H}" fill="url(#glowGrad)"/>

    <g>
      ${stars}
    </g>

    <text x="${pad}" y="68" font-size="${nameFontSize}" font-weight="700" fill="#ffffff" letter-spacing="-0.5" ${nameTextAttrs} font-family="-apple-system,Segoe UI,sans-serif">${name}</text>
    <text x="${pad}" y="98" font-size="16" font-weight="500" fill="#71717a" font-family="-apple-system,Segoe UI,sans-serif">@${escapeXml(user.login)}</text>

    <rect x="${W - pad - 140}" y="42" width="140" height="32" rx="16" fill="#ffffff" opacity="0.07"/>
    <text x="${W - pad - 70}" y="63" font-size="13" font-weight="600" fill="#e4e4e7" text-anchor="middle" font-family="-apple-system,Segoe UI,sans-serif">★ ${yearsOnGitHub} yrs active</text>

    ${bioSvg}

    <line x1="${pad}" y1="174" x2="${W - pad}" y2="174" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1.5"/>

    ${statCols}

    <line x1="${pad}" y1="358" x2="${W - pad}" y2="358" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1.5"/>

    ${langRows}

    <rect width="${W}" height="${H}" rx="28" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5"/>
  </g>
</svg>`.trim();

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
