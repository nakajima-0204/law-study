/**
 * CourtListener 無料REST API から米国最高裁（SCOTUS）判例を取得して DB に保存する。
 * APIキー不要。
 * 実行: node scripts/fetch-cases-scotus.mjs [--force] [--limit=N]
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CL_API = "https://www.courtlistener.com/api/rest/v4/search/";
const DELAY_MS = 500;

// 検索クエリ → 法律IDマッピング
const SEARCHES = [
  { q: "constitutional rights due process equal protection",      ids: ["us-law"] },
  { q: "first amendment free speech freedom of religion",        ids: ["us-law"] },
  { q: "fourth amendment search seizure privacy",                ids: ["us-law", "privacy-ko"] },
  { q: "commerce clause federal power separation of powers",     ids: ["us-law"] },
  { q: "civil rights discrimination race gender",                ids: ["us-law", "jinshu-sabetsu"] },
  { q: "criminal procedure miranda rights sixth amendment",      ids: ["us-law"] },
  { q: "intellectual property patent copyright trademark",       ids: ["us-law", "trips"] },
  { q: "antitrust competition monopoly Sherman Act",             ids: ["us-law"] },
  { q: "immigration deportation asylum refugee",                 ids: ["us-law", "nanmin-joyaku2"] },
  { q: "environmental regulation clean air water EPA",           ids: ["us-law", "paris-kyotei"] },
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
    const { rows } = await pool.query("SELECT COUNT(*) FROM cases WHERE law_id=$1 AND court LIKE '%Supreme Court%'", [lawId]);
    return parseInt(rows[0].count);
  } catch { return 0; } finally { await pool.end(); }
}

async function dbInsertMany(lawId, cases) {
  if (!cases.length) return;
  const pool = makePool();
  const client = await pool.connect();
  try {
    for (const c of cases) {
      await client.query(
        `INSERT INTO cases (law_id,title,court,date,summary,holding,significance,citation,article,source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
        [lawId, c.title, c.court, c.date, c.summary, c.holding, c.significance, c.citation, c.article, c.source]
      );
    }
  } finally { client.release(); await pool.end(); }
}

async function dbClear(lawId) {
  const pool = makePool();
  try { await pool.query("DELETE FROM cases WHERE law_id=$1 AND court LIKE '%Supreme Court%'", [lawId]); }
  finally { await pool.end(); }
}

// ── API呼び出し ──────────────────────────────────────────────────
async function searchSCOTUS(q, pageSize = 10) {
  const params = new URLSearchParams({
    q,
    type: "o",
    court: "scotus",
    stat_Precedential: "on",
    order_by: "score desc",
    page_size: String(pageSize),
  });
  const res = await fetch(`${CL_API}?${params}`, {
    headers: { "Accept": "application/json", "User-Agent": "LawStudyApp/1.0" },
  });
  if (!res.ok) throw new Error(`CourtListener ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

function buildCase(r) {
  const citation = r.citation?.[0] ?? r.neutralCite ?? "";
  const date = r.dateFiled ?? r.dateArgued ?? "";
  const snippet = (r.snippet ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

  return {
    title: r.caseName ?? "Unknown",
    court: "United States Supreme Court",
    date: date.slice(0, 10),
    citation,
    article: r.suitNature ?? "",
    summary: snippet.slice(0, 600) || r.caseName,
    holding: snippet.slice(0, 600),
    significance: `米国最高裁判例。${r.suitNature ? r.suitNature + "事件。" : ""}引用: ${citation}`,
    source: `https://www.courtlistener.com${r.absolute_url ?? ""}`,
  };
}

// ── メイン ───────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const limitArg = args.find(a => a.startsWith("--limit="));
  const perQuery = limitArg ? Math.ceil(parseInt(limitArg.split("=")[1]) / SEARCHES.length) : 8;

  console.log(`\n🇺🇸 SCOTUS 判例取込  (CourtListener API)\n`);

  const lawCasesMap = {};
  const seenTitles = new Set();

  for (const { q, ids } of SEARCHES) {
    process.stdout.write(`  🔍 "${q.slice(0, 40)}"... `);
    try {
      const results = await searchSCOTUS(q, perQuery);
      let added = 0;
      for (const r of results) {
        if (seenTitles.has(r.caseName)) continue;
        seenTitles.add(r.caseName);
        const c = buildCase(r);
        for (const id of ids) {
          if (!lawCasesMap[id]) lawCasesMap[id] = [];
          lawCasesMap[id].push(c);
        }
        added++;
      }
      console.log(`${added}件`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log("\n💾 DB保存中...");
  let saved = 0, skipped = 0;
  for (const [lawId, cases] of Object.entries(lawCasesMap)) {
    const existing = await dbCount(lawId);
    if (!force && existing > 0) {
      console.log(`  ⏭  ${lawId}: スキップ（${existing}件存在）`);
      skipped++;
      continue;
    }
    if (force) await dbClear(lawId);
    await dbInsertMany(lawId, cases);
    console.log(`  ✅ ${lawId}: ${cases.length}件保存`);
    saved++;
  }
  console.log(`\n✅ 完了: 保存=${saved}, スキップ=${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
