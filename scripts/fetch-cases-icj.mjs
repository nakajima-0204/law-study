/**
 * ICJ（国際司法裁判所）公式サイトから全判例を取得して Neon DB に保存する。
 * 実行:
 *   node scripts/fetch-cases-icj.mjs [lawId] [--force]   → スクレイピング → JSON保存 → DB投入
 *   node scripts/fetch-cases-icj.mjs --import-json       → JSON→DB のみ（スクレイピングスキップ）
 */

import { chromium } from "playwright";
import pg from "pg";
import dotenv from "dotenv";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, "_icj_cache.json");

const ICJ_BASE = "https://www.icj-cij.org";
const DELAY_MS = 1800;

/**
 * ICJ事件の subject キーワード → 法律ID の対応
 * 各キーワードに一致すれば、その法律IDに判例を追加する。
 */
const KEYWORD_TO_LAW = [
  { pattern: /treaty|convention|pacta|jus cogens|vienna convention on the law/i, ids: ["kokusai-joyaku"] },
  { pattern: /united nations|un charter|security council|general assembly/i, ids: ["kokuren-kensho"] },
  { pattern: /state responsibility|reparation|countermeasure|attribution/i, ids: ["kokusai-siko"] },
  { pattern: /diplomatic|consular|immunity|envoy/i, ids: ["gaiko-tokken", "ryoji-tokken"] },
  { pattern: /maritime|sea|UNCLOS|continental shelf|exclusive economic zone|fisheries|territorial waters/i, ids: ["kaiyoho"] },
  { pattern: /aviation|aerial|airspace|chicago convention/i, ids: ["kouku-joyaku"] },
  { pattern: /outer space|moon|satellite/i, ids: ["uchu-joyaku", "uchu-joyaku2"] },
  { pattern: /genocide|war crime|crime against humanity|ICC|Rome Statute/i, ids: ["rome-kitei"] },
  { pattern: /humanitarian law|armed conflict|Geneva Convention|prisoner of war|civilian/i, ids: ["geneva", "sensou-kokusaiho"] },
  { pattern: /nuclear weapon|nuclear test|disarmament/i, ids: ["kakuheiki"] },
  { pattern: /environment|pollution|climate|biodiversity/i, ids: ["paris-kyotei", "kankyo-kihon", "climate-sosho-intl"] },
  { pattern: /trade|WTO|GATT|tariff|dumping/i, ids: ["wto"] },
  { pattern: /investment|ICSID|expropriation|BIT/i, ids: ["isds"] },
  { pattern: /human rights|right to life|torture|fair trial/i, ids: ["jiyuken-kitei", "gomon-kinshi"] },
  { pattern: /refugee|asylum|non-refoulement/i, ids: ["nanmin-joyaku2"] },
  { pattern: /self-determination|decolonization|territory/i, ids: ["kokuren-kensho", "kokusai-siko"] },
  { pattern: /jurisdiction|admissibility|preliminary objection/i, ids: ["kokusai-minsosho"] },
  { pattern: /extradition|mutual legal assistance|criminal cooperation/i, ids: ["hikiawase-joyaku", "kokusai-keiji-kyoryoku"] },
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
    const { rows } = await pool.query("SELECT COUNT(*) FROM cases WHERE law_id = $1", [lawId]);
    return parseInt(rows[0].count);
  } catch { return 0; } finally { await pool.end(); }
}

async function dbInsertMany(lawId, cases) {
  if (cases.length === 0) return;
  const pool = makePool();
  const client = await pool.connect();
  try {
    // 同一 source は重複挿入しない
    for (const c of cases) {
      await client.query(
        `INSERT INTO cases (law_id,title,court,date,summary,holding,significance,citation,article,source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT DO NOTHING`,
        [lawId, c.title, c.court, c.date, c.summary, c.holding, c.significance, c.citation, c.article, c.source]
      );
    }
  } finally {
    client.release();
    await pool.end();
  }
}

async function dbClearLawId(lawId) {
  const pool = makePool();
  try { await pool.query("DELETE FROM cases WHERE law_id = $1", [lawId]); }
  finally { await pool.end(); }
}

// ── ICJ スクレイピング ────────────────────────────────────────────

/** /list-of-all-cases ページから全事件リストを取得 */
async function fetchCaseList(page) {
  await page.goto(`${ICJ_BASE}/list-of-all-cases`, { waitUntil: "networkidle", timeout: 30000 });

  const cases = await page.evaluate((base) => {
    const results = [];
    const seen = new Set();
    // href が "case/NNN" 形式（絶対・相対どちらも）
    document.querySelectorAll("a[href]").forEach(el => {
      const href = el.getAttribute("href") ?? "";
      const m = href.match(/(?:^|\/)case\/(\d+)$/);
      if (!m) return;
      const id = m[1];
      if (seen.has(id)) return;
      seen.add(id);
      const title = el.textContent.trim();
      if (!title || title.length < 5) return;
      const url = href.startsWith("http") ? href : `${base}/${href}`;
      results.push({ id, title, url });
    });
    return results;
  }, ICJ_BASE);

  return cases;
}

/** 個別事件ページから概要・判決情報を取得（最大3回リトライ） */
async function fetchCaseDetail(page, caseUrl, caseId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(caseUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
      break;
    } catch (e) {
      if (attempt === 2) return null;
      await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
    }
  }

  // page.evaluate は第2引数を1つしか受け取れないためオブジェクトで渡す
  return page.evaluate(({ caseId, base }) => {
    const text = (sel) => document.querySelector(sel)?.textContent?.replace(/\s+/g, " ").trim() ?? "";

    // フィールドを dl/dt/dd から収集
    const fields = {};
    document.querySelectorAll("dt, dd").forEach(el => {
      if (el.tagName === "DT") fields._lastKey = el.textContent.trim();
      else if (el.tagName === "DD" && fields._lastKey) {
        fields[fields._lastKey] = el.textContent.replace(/\s+/g, " ").trim();
        fields._lastKey = "";
      }
    });

    // タイトル
    const title =
      text("h1") ||
      text(".case-title") ||
      text(".page-title") ||
      (document.title || "").replace(" - International Court of Justice", "");

    // 概要（最初の複数段落）
    const paras = [];
    document.querySelectorAll("main p, article p, .field--type-text-with-summary p").forEach(el => {
      const t = el.textContent.replace(/\s+/g, " ").trim();
      if (t.length > 30) paras.push(t);
    });
    const summary = paras.slice(0, 3).join(" ").slice(0, 600);

    // 年または日付（本文から抽出）
    const yearMatch = summary.match(/\b(19|20)\d{2}\b/);
    const date = fields["Filing date"] || fields["Date"] || fields["Year"] || (yearMatch ? yearMatch[0] : "");

    // 事件分類
    const subject = fields["Subject"] || fields["Type of case"] || text(".subject") || title;

    // 結論（後半段落）
    const holding = paras.slice(3, 6).join(" ").slice(0, 600);

    return {
      title: title.slice(0, 300),
      date: date.slice(0, 50),
      summary: (summary + " " + subject).trim().slice(0, 600),
      holding: holding.slice(0, 600),
      subject: subject.slice(0, 300),
      citation: `ICJ Case No. ${caseId}`,
      source: `${base}/case/${caseId}`,
    };
  }, { caseId, base: ICJ_BASE });
}

/** キーワードマッチで法律IDリストを返す */
function matchLawIds(title, subject, summary) {
  const text = `${title} ${subject} ${summary}`.toLowerCase();
  const matched = new Set();
  for (const rule of KEYWORD_TO_LAW) {
    if (rule.pattern.test(text)) {
      rule.ids.forEach(id => matched.add(id));
    }
  }
  return [...matched];
}

// ── DB保存 ───────────────────────────────────────────────────────
async function saveToDb(lawCasesMap, targetLawId, force) {
  console.log("\n💾 DB保存中...");
  let saved = 0, skipped = 0;

  for (const [lawId, cases] of Object.entries(lawCasesMap)) {
    if (targetLawId && lawId !== targetLawId) continue;
    const existing = await dbCount(lawId);
    if (!force && existing > 0) {
      console.log(`  ⏭  ${lawId}: スキップ（${existing}件存在）`);
      skipped++;
      continue;
    }
    if (force) await dbClearLawId(lawId);
    await dbInsertMany(lawId, cases);
    console.log(`  ✅ ${lawId}: ${cases.length}件保存`);
    saved++;
  }
  console.log(`\n✅ 完了: 保存=${saved}法律, スキップ=${skipped}法律`);
}

// ── メイン ───────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const importOnly = args.includes("--import-json");
  const targetLawId = args.find(a => !a.startsWith("--"));

  // --import-json: スクレイピングせずキャッシュJSONからDB投入のみ
  if (importOnly) {
    if (!existsSync(CACHE_PATH)) {
      console.error("❌ キャッシュが見つかりません:", CACHE_PATH);
      process.exit(1);
    }
    const lawCasesMap = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
    console.log(`📂 JSONキャッシュ読込: ${Object.keys(lawCasesMap).length}法律`);
    await saveToDb(lawCasesMap, targetLawId, force);
    return;
  }

  console.log(`\n⚖️  ICJ 判例取込  force=${force}${targetLawId ? ` target=${targetLawId}` : ""}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

  // 事件リスト取得
  console.log("📋 ICJ 全事件リスト取得中...");
  let caseList;
  try {
    caseList = await fetchCaseList(page);
    console.log(`  ${caseList.length}件の事件を検出\n`);
  } catch (e) {
    console.error("事件リスト取得失敗:", e.message);
    await browser.close();
    process.exit(1);
  }

  // 事件ごとに詳細取得 & 法律IDマッピング
  const lawCasesMap = {};

  for (const [i, entry] of caseList.entries()) {
    process.stdout.write(`  [${i + 1}/${caseList.length}] ${entry.title.slice(0, 50)}... `);

    let detail;
    try {
      detail = await fetchCaseDetail(page, entry.url, entry.id);
    } catch (e) {
      console.log(`❌ ${e.message.slice(0, 40)}`);
      await new Promise(r => setTimeout(r, DELAY_MS));
      continue;
    }

    if (!detail) {
      console.log("スキップ");
      await new Promise(r => setTimeout(r, DELAY_MS));
      continue;
    }

    const ids = matchLawIds(entry.title, detail.subject, detail.summary);
    if (ids.length === 0) {
      console.log(`（マッチなし）`);
      await new Promise(r => setTimeout(r, 600));
      continue;
    }

    const c = {
      title: detail.title || entry.title,
      court: "国際司法裁判所（ICJ）",
      date: detail.date,
      citation: detail.citation,
      article: detail.subject ? `争点: ${detail.subject.slice(0, 80)}` : "",
      summary: detail.summary,
      holding: detail.holding || detail.summary,
      significance: "国際司法裁判所（ICJ）判決",
      source: detail.source,
    };

    for (const id of ids) {
      if (!lawCasesMap[id]) lawCasesMap[id] = [];
      lawCasesMap[id].push(c);
    }

    console.log(`✅ → ${ids.join(", ")}`);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  await browser.close();

  // JSONに保存（DB失敗時のバックアップ）
  writeFileSync(CACHE_PATH, JSON.stringify(lawCasesMap, null, 2), "utf-8");
  const total = Object.values(lawCasesMap).reduce((s, arr) => s + arr.length, 0);
  console.log(`\n📂 キャッシュ保存: ${Object.keys(lawCasesMap).length}法律 ${total}件 → ${CACHE_PATH}`);

  await saveToDb(lawCasesMap, targetLawId, force);
}

main().catch(e => { console.error(e); process.exit(1); });
