// Entry program for the make.fun "news-image-20261123" competition.
//
// Written from scratch for the 23 November 2026 edition. The program
// holds the day's news as data, draws a dense 1024x1024 front page as
// an SVG document, rasterises that SVG to entry.png beside this file
// (via the system CairoSVG when present), then delivers the PNG to
// $MAKEFUN_OUTPUT_DIR (or /output) and sanity-checks the result:
// PNG signature, IHDR dimensions within 1024x1024, size <= 1 MiB.
//
// If no SVG rasteriser is available at delivery time, the previously
// rendered entry.png beside this file is delivered unchanged, so the
// program still works in a bare Node 24 container.
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const W = 1024;
const H = 1024;
const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- news
// 42 items, 6 sections x 7. Headlines and one-line context as reported
// on 23 November 2026 (some from late 22 November wires still leading
// the 23 November front pages). Full source list lives in SOURCES.md.
const SECTIONS = [
  {
    name: "WORLD", color: "#b03a2e",
    items: [
      ["COP31 ends with no climate deal", "Antalya: EU + ~130 parties reject text omitting fossil fuels"],
      ["Russian strike on Dymer kills 10+", "Apartment block near Kyiv hit; rescuers search the rubble"],
      ["Kryvyi Rih attack kills two", "Zelenskyy's hometown: 25 buildings, hospital, schools hit"],
      ["Drones kill five children in Sudan", "Deadly drone attacks strike Khartoum and Omdurman"],
      ["24 civilians killed in South Sudan", "Paramilitary attack reported on civilians"],
      ["Houthis claim Saudi refinery hit", "Saudi strike on Hodeida follows; Yemen fighting escalates"],
      ["Gaza called a 'toxic wasteland'", "New report: war left contamination across 99% of Gaza"],
    ],
  },
  {
    name: "POLITICS", color: "#1a5276",
    items: [
      ["Democrats lock in House majority", "Hubbard beats Foxx in NC recount; Dems reach 258+ seats"],
      ["Trump, Putin, Xi meet in Shenzhen", "Trilateral summit issues 'Declaration toward Peace'"],
      ["Trump hails summit 'amazing event'", "90-minute White House news conference touts Asia trip"],
      ["Trump dares Iran on Hormuz blockade", "'They'll all be at the bottom of the sea,' he warns"],
      ["Trump: Iran deal must be 'real'", "Says Tehran wants a deal, but not one acceptable to him"],
      ["UN top-job bid blocked", "UK, France, China block Nusseibeh after 9th straw poll"],
      ["Slovakia rejects EU Ukraine loan", "Bratislava refuses share of new 45 billion euro package"],
    ],
  },
  {
    name: "ECONOMY", color: "#7d6608",
    items: [
      ["AI sell-off rattles world markets", "S&P 500 -3.7%; Japan's Nikkei plunges 5.06% on AI fears"],
      ["US futures rebound on Monday", "S&P futures +2.4%, Nasdaq 100 +3% after Friday's rout"],
      ["Sensex plunges 1,484 points", "Nifty dives to 25,350 as banks drag Indian markets down"],
      ["Korea exports top $1 trillion", "First time ever, driven by global AI chip demand"],
      ["CrowdStrike to buy Zscaler", "All-stock cybersecurity merger valued at $43.9 billion"],
      ["Bitcoin back above $60,000", "Crypto rebounds to ~$61,386 after last week's slide"],
      ["China state funds buy record ETFs", "Margin cut in Beijing; Korea readies stabilisation fund"],
    ],
  },
  {
    name: "TECHNOLOGY", color: "#5b2c6f",
    items: [
      ["Meta chief: superintelligence near", "Alexandr Wang: next year's actions carry 'great consequence'"],
      ["Claim: Riemann Hypothesis proved", "Anthropic mathematician + Claude publish Lean archive"],
      ["Laptop-sized AI designs chips", "MIT's SLIC small model solves 87.1% of analog tasks"],
      ["OpenAI proposes AI 'speed limit'", "Pachocki: shared perplexity limits to pace frontier AI"],
      ["AI agents exploit medical zero-day", "AWS: autonomous agents took a server at East Asia unis"],
      ["Together AI prompt data downloaded", "Exposed credential let intruder pull stored prompt samples"],
      ["Nvidia rebounds 7% premarket", "Bounce after losing a third of its value in two weeks"],
    ],
  },
  {
    name: "SCIENCE & HEALTH", color: "#117864",
    items: [
      ["The sky feeds the sea", "Study: 12.8M tonnes of nitrogen fall into oceans yearly"],
      ["NHS opens AI breast-screen trial", "EDITH trial starts in Cambridgeshire, 30 sites planned"],
      ["Bangladesh vaccinates 50M children", "Month-long drive targets drug-resistant typhoid strains"],
      ["Ebola response disrupted in Congo", "Fighting near outbreak zone in eastern DR Congo"],
      ["Taliban guards vanishing forests", "'Green Units' police protect Afghanistan's last forests"],
      ["Indonesia factory fire kills 24", "Candy factory blaze; search for missing workers goes on"],
      ["Brazil storm devastates town", "Supercell flattens Tupancireta; thousands displaced"],
    ],
  },
  {
    name: "SPORT", color: "#935116",
    items: [
      ["Marquez wins 8th MotoGP crown", "Portimao title equals Agostini's premier-class record"],
      ["Alcaraz wins maiden ATP Finals", "Beats world No.1 Zverev 6-2, 7-6 in Turin final"],
      ["India Test ends in a draw", "NZ's Mitchell and Phillips frustrate India on day five"],
      ["Liverpool thrash Manchester Utd", "Pochettino's nightmare start deepens at Old Trafford"],
      ["Mercedes near F1 constructors' title", "Just 3 points ahead of Ferrari with four races left"],
      ["Belgium airports face shutdown", "Nationwide anti-austerity strike to ground flights"],
      ["El Nino warning for Himalaya", "Report: floods, landslides, avalanche risk rising"],
    ],
  },
];

// ------------------------------------------------------------ svg utils
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// Crude but effective text fitting: DejaVu Sans averages ~0.60em per
// character in bold and ~0.55em in regular at these sizes. Anything
// longer than the budget is cut with an ellipsis so nothing overflows.
function fit(text, maxPx, fontPx, bold) {
  const perChar = fontPx * (bold ? 0.6 : 0.54);
  const maxChars = Math.max(8, Math.floor(maxPx / perChar));
  if (text.length <= maxChars) return text;
  let cut = text.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.6) cut = cut.slice(0, lastSpace);
  return cut.trimEnd() + "…";
}

function buildSvg() {
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  parts.push(`<rect width="${W}" height="${H}" fill="#f7f3ea"/>`);

  // Header band
  parts.push(`<rect width="${W}" height="78" fill="#14213d"/>`);
  parts.push(`<text x="24" y="36" font-family="DejaVu Sans" font-size="27" font-weight="bold" fill="#ffffff">THE WORLD IN ONE PAGE</text>`);
  parts.push(`<text x="24" y="62" font-family="DejaVu Sans" font-size="14" fill="#fca311">Monday, 23 November 2026 &#183; 42 stories &#183; compiled from the day's wires</text>`);
  parts.push(`<text x="1000" y="36" text-anchor="end" font-family="DejaVu Sans" font-size="15" font-weight="bold" fill="#fca311">NEWS-IMAGE</text>`);
  parts.push(`<text x="1000" y="62" text-anchor="end" font-family="DejaVu Sans" font-size="13" fill="#ffffff">23 NOV 2026</text>`);

  // Market ticker strip
  parts.push(`<rect y="78" width="${W}" height="27" fill="#e5ded0"/>`);
  parts.push(`<text x="24" y="97" font-family="DejaVu Sans" font-size="13" fill="#14213d"><tspan font-weight="bold">MARKETS</tspan>  S&amp;P 500 -3.7% &#183; Nikkei -5.06% &#183; Sensex -1.77% &#183; Gold +2.7% (~$3,600) &#183; Brent ~$90 &#183; Bitcoin &gt;$61,000 &#183; Oil steady</text>`);

  // Section grid: 3 columns x 2 rows
  const margin = 16, gap = 10;
  const colW = (W - margin * 2 - gap * 2) / 3; // 324
  const gridTop = 117;
  const secH = (H - gridTop - 30 - gap) / 2; // ~438.5
  const innerW = colW - 16;

  SECTIONS.forEach((sec, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = margin + col * (colW + gap);
    const y = gridTop + row * (secH + gap);
    parts.push(`<rect x="${x}" y="${y}" width="${colW}" height="${secH}" fill="#ffffff" stroke="#d8d2c4"/>`);
    parts.push(`<rect x="${x}" y="${y}" width="${colW}" height="26" fill="${sec.color}"/>`);
    parts.push(`<text x="${x + 8}" y="${y + 18}" font-family="DejaVu Sans" font-size="14" font-weight="bold" fill="#ffffff">${esc(sec.name)}</text>`);
    parts.push(`<text x="${x + colW - 8}" y="${y + 18}" text-anchor="end" font-family="DejaVu Sans" font-size="11" fill="#ffffff">7 stories</text>`);

    sec.items.forEach((item, j) => {
      const iy = y + 26 + j * ((secH - 26) / 7);
      const ih = (secH - 26) / 7;
      parts.push(`<text x="${x + 8}" y="${iy + 21}" font-family="DejaVu Sans" font-size="12.5" font-weight="bold" fill="#1b1b1b">${esc(fit(item[0], innerW, 12.5, true))}</text>`);
      parts.push(`<text x="${x + 8}" y="${iy + 39}" font-family="DejaVu Sans" font-size="10.5" fill="#4d4d4d">${esc(fit(item[1], innerW, 10.5, false))}</text>`);
      if (j < 6) parts.push(`<line x1="${x + 8}" y1="${iy + ih - 4}" x2="${x + colW - 8}" y2="${iy + ih - 4}" stroke="#e8e2d2"/>`);
    });
  });

  // Footer
  parts.push(`<text x="24" y="${H - 10}" font-family="DejaVu Sans" font-size="11" fill="#555555">Sources: BBC, AP, Reuters wires via OneTurn, CNN, Al Jazeera, Just Security, Investopedia, Hindu BusinessLine, MIT News, AWS, CASRAI, Newswise &#183; Full list: SOURCES.md</text>`);
  parts.push("</svg>");
  return parts.join("\n");
}

// ------------------------------------------------------------- delivery
const svg = buildSvg();
const localPng = join(here, "entry.png");
const localSvg = join(here, "entry.svg");
writeFileSync(localSvg, svg);

let rendered = false;
try {
  execFileSync("python3", ["-m", "cairosvg", localSvg, "-o", localPng], { stdio: "pipe" });
  rendered = existsSync(localPng);
} catch {
  rendered = false;
}
if (!rendered && !existsSync(localPng)) {
  console.error("could not render entry.png and no pre-rendered copy exists");
  process.exit(1);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, "entry.png");
if (dest !== localPng) copyFileSync(localPng, dest);

const data = readFileSync(dest);
const sigOk = data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const w = data.readUInt32BE(16), h = data.readUInt32BE(20);
if (!sigOk || w > 1024 || h > 1024 || data.length > 1024 * 1024) {
  console.error(`invalid entry: sig=${sigOk} ${w}x${h} ${data.length} bytes`);
  process.exit(1);
}
const total = SECTIONS.reduce((n, s) => n + s.items.length, 0);
console.log(`entry.png delivered: ${w}x${h}, ${data.length} bytes, ${total} stories, rendered=${rendered}, to ${dest}`);
