/**
 * WTO紛争解決（DS案件）から判例を取得して Neon DB に保存する。
 * Playwright不要。個別DSページを直接fetchで取得。
 * 実行: node scripts/fetch-cases-wto.mjs [--force] [--limit=N] [--start=N]
 */

import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
function loadEnv(file) {
  try {
    for (const line of readFileSync(join(__dir, "..", file), "utf-8").split(/\r?\n/)) {
      const m = line.match(/^([^#\s=][^=]*)=(.*)/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      if (val && !process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadEnv(".env.production.local");
loadEnv(".env.local");

const WTO_CASE = (ds) =>
  `https://www.wto.org/english/tratop_e/dispu_e/cases_e/ds${String(ds).padStart(3, "0")}_e.htm`;
const DELAY_MS = 800;

// キーワード → 法律IDマッピング
const KEYWORD_TO_LAW = [
  { pattern: /GATT|goods|tariff|dumping|anti-dumping|subsid|safeguard|customs/i, ids: ["wto"] },
  { pattern: /GATS|services|financial.?services|telecom|services trade/i, ids: ["gats", "wto"] },
  { pattern: /TRIPS|patent|trademark|copyright|intellectual.?property|GI|geographical/i, ids: ["trips", "wto"] },
  { pattern: /SPS|sanitary|phytosanitary|food.?safety|plant|animal health/i, ids: ["wto"] },
  { pattern: /TBT|technical.?barrier|standards|labelling/i, ids: ["wto"] },
  { pattern: /investment|expropriation|BIT|ISDS/i, ids: ["isds"] },
  { pattern: /environment|climate|carbon|emission/i, ids: ["wto", "paris-kyotei"] },
];

// ── DB ───────────────────────────────────────────────────────────
const { Pool } = pg;
function makePool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
}

async function dbCount(lawId) {
  const pool = makePool();
  try {
    const { rows } = await pool.query("SELECT COUNT(*) FROM cases WHERE law_id=$1 AND court LIKE '%WTO%'", [lawId]);
    return parseInt(rows[0].count);
  } catch { return 0; } finally { await pool.end(); }
}

async function dbInsertMany(lawId, cases) {
  if (!cases.length) return 0;
  const pool = makePool();
  const client = await pool.connect();
  let n = 0;
  try {
    for (const c of cases) {
      const r = await client.query(
        `INSERT INTO cases (law_id,title,court,date,summary,holding,significance,citation,article,source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
        [lawId, c.title, c.court, c.date, c.summary, c.holding, c.significance, c.citation, c.article, c.source]
      );
      n += r.rowCount ?? 0;
    }
  } finally { client.release(); await pool.end(); }
  return n;
}

async function dbClear(lawId) {
  const pool = makePool();
  try { await pool.query("DELETE FROM cases WHERE law_id=$1 AND court LIKE '%WTO%'", [lawId]); }
  finally { await pool.end(); }
}

// ── WTOページ取得 ─────────────────────────────────────────────────
function stripHtml(s) {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

async function fetchDS(ds) {
  const url = WTO_CASE(ds);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LawStudyBot/1.0)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Title from page title: "WTO | ... - DS123: TITLE"
    const titleM = html.match(/DS\d+:\s*([^<\n]{10,250})/);
    if (!titleM) return null;
    const title = titleM[1].trim();

    // Year from content
    const yearM = html.match(/\b(19|20)\d{2}\b/);
    const date = yearM ? yearM[0] : "";

    // Complainant/Respondent from table cells
    const tdPairs = [];
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let row;
    while ((row = rowRe.exec(html)) !== null) {
      const cells = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (cells.length >= 2) {
        const k = stripHtml(cells[0]).toLowerCase();
        const v = stripHtml(cells[1]);
        if (k.includes("complainant") || k.includes("respondent") || k.includes("subject")) {
          tdPairs.push({ k, v });
        }
      }
    }
    const complainant = tdPairs.find(p => p.k.includes("complainant"))?.v || "";
    const respondent = tdPairs.find(p => p.k.includes("respondent"))?.v || "";
    const subjectRow = tdPairs.find(p => p.k.includes("subject"))?.v || "";

    // Body paragraphs
    const paras = [];
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pm;
    while ((pm = pRe.exec(html)) !== null) {
      const t = stripHtml(pm[1]);
      if (t.length > 40 && !t.includes("Home") && !t.includes("World Trade")) paras.push(t);
    }
    const summary = paras.slice(0, 2).join(" ").slice(0, 500) || `WTO紛争解決DS${ds}: ${title}`;
    const holding = paras.slice(2, 4).join(" ").slice(0, 500) || summary;

    return {
      title: `DS${ds}: ${title}`.slice(0, 200),
      date,
      summary,
      holding,
      complainant: complainant.slice(0, 80),
      respondent: respondent.slice(0, 80),
      subject: subjectRow.slice(0, 100),
      fullText: `${title} ${subjectRow} ${summary}`.toLowerCase(),
      source: url,
    };
  } catch {
    return null;
  }
}

function matchLawIds(text) {
  const matched = new Set();
  for (const rule of KEYWORD_TO_LAW) {
    if (rule.pattern.test(text)) rule.ids.forEach(id => matched.add(id));
  }
  if (matched.size === 0) matched.add("wto");
  return [...matched];
}

// ── メイン ───────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const limitArg = args.find(a => a.startsWith("--limit="));
  const startArg = args.find(a => a.startsWith("--start="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : 150;
  const startDs = startArg ? parseInt(startArg.split("=")[1]) : 620;

  console.log(`\n🌐 WTO 判例取込  start=DS${startDs} limit=${limit} force=${force}\n`);

  const lawCasesMap = {};
  let fetched = 0, skipped = 0;

  for (let ds = startDs; ds >= 1 && fetched < limit; ds--) {
    process.stdout.write(`  DS${ds}... `);
    const detail = await fetchDS(ds);

    if (!detail) {
      process.stdout.write("404\n");
      skipped++;
      // DS番号が存在しない場合は数をカウントしない
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    const ids = matchLawIds(detail.fullText);
    const c = {
      title: detail.title,
      court: "WTO紛争解決機関（DSB）",
      date: detail.date,
      citation: `DS${ds}`,
      article: [
        detail.complainant ? `申立国: ${detail.complainant}` : "",
        detail.respondent ? `被申立国: ${detail.respondent}` : "",
      ].filter(Boolean).join(" / "),
      summary: detail.summary,
      holding: detail.holding,
      significance: `WTO紛争解決機関（DSB）案件 DS${ds}`,
      source: detail.source,
    };

    for (const id of ids) {
      if (!lawCasesMap[id]) lawCasesMap[id] = [];
      lawCasesMap[id].push(c);
    }
    console.log(`✅ → ${ids.join(", ")}`);
    fetched++;
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n📊 取得: ${fetched}件, 404スキップ: ${skipped}件`);
  console.log("\n💾 DB保存中...");
  let saved = 0, dbSkipped = 0;
  for (const [lawId, cases] of Object.entries(lawCasesMap)) {
    const existing = await dbCount(lawId);
    if (!force && existing > 0) {
      console.log(`  ⏭  ${lawId}: スキップ（${existing}件WTO判例存在）`);
      dbSkipped++;
      continue;
    }
    if (force) await dbClear(lawId);
    const n = await dbInsertMany(lawId, cases);
    console.log(`  ✅ ${lawId}: ${n}件保存（${cases.length}件中）`);
    saved++;
  }
  console.log(`\n✅ 完了: 保存=${saved}法律, スキップ=${dbSkipped}法律`);
}

main().catch(e => { console.error(e); process.exit(1); });
