/**
 * courts.go.jp から判例を全件取得して Neon DB に保存する。
 * 実行: node scripts/fetch-cases-courts.mjs [lawId] [--force]
 *   lawId 省略時: egov_id を持つ全法律を処理
 *   --force  : DB に既存データがあっても再取得する
 *   --missing: DB に 0 件の法律だけ処理する
 */

import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LAWS_TS = join(ROOT, "lib", "laws.ts");
const OVERRIDES_PATH = join(__dirname, "case-search-overrides.json");

const SEARCH_OVERRIDES = existsSync(OVERRIDES_PATH)
  ? JSON.parse(readFileSync(OVERRIDES_PATH, "utf-8"))
  : {};

const SEARCH_SAIKOSAI = "https://www.courts.go.jp/hanrei/search2/index.html";
const SEARCH_KOUSAI   = "https://www.courts.go.jp/hanrei/search3/index.html";
const SEARCH_IP       = "https://www.courts.go.jp/hanrei/search7/index.html";
const DETAIL_BASE     = "https://www.courts.go.jp/hanrei";
const PAGE_SIZE       = 20;   // courts.go.jp は1ページ20件固定
const MAX_TOTAL       = 2000; // サイト側の上限
const DELAY_MS        = 1500;
const PAGE_DELAY_MS   = 800;

const IP_LAW_IDS = new Set(["tokkyo","jitsuyoann","isho","shouhyo","chosakuken","fusei-kyoso","benrishi"]);

// ── DB ───────────────────────────────────────────────
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

async function dbQuery(sql, params = []) {
  const pool = makePool();
  try {
    const { rows } = await pool.query(sql, params);
    return rows;
  } finally {
    await pool.end();
  }
}

async function dbCount(lawId) {
  try {
    const rows = await dbQuery(`SELECT COUNT(*) FROM cases WHERE law_id = $1`, [lawId]);
    return parseInt(rows[0].count);
  } catch {
    return 0;
  }
}

async function dbReplace(lawId, cases) {
  const pool = makePool();
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM cases WHERE law_id = $1`, [lawId]);
    if (cases.length === 0) return;
    const COLS = ["law_id","title","court","date","summary","holding","significance","citation","article","source"];
    const placeholders = [];
    const values = [];
    let i = 1;
    for (const c of cases) {
      const row = [lawId, c.title, c.court, c.date, c.summary, c.holding, c.significance, c.citation, c.article, c.source];
      placeholders.push(`(${row.map(() => `$${i++}`).join(",")})`);
      values.push(...row);
    }
    await client.query(
      `INSERT INTO cases (${COLS.join(",")}) VALUES ${placeholders.join(",")}`,
      values
    );
  } finally {
    client.release();
    await pool.end();
  }
}

// ── 法律リスト抽出 ───────────────────────────────────
function extractLaws() {
  const ts = readFileSync(LAWS_TS, "utf-8");
  const laws = [];
  const seen = new Set();
  for (const line of ts.split("\n")) {
    const m = line.match(/\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*egov_id:\s*"([^"]+)"\s*\}/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      laws.push({ id: m[1], name: m[2], egov_id: m[3] });
    }
  }
  return laws;
}

// ── 日付パース ───────────────────────────────────────
function parseDate(str) {
  const m = str?.match(/(令和|平成|昭和|大正)(\d+)年(\d+)月(\d+)日/);
  if (!m) return str ?? "";
  const era = m[1], y = parseInt(m[2]), mo = parseInt(m[3]), d = parseInt(m[4]);
  let year = y;
  if (era === "令和") year = 2018 + y;
  else if (era === "平成") year = 1988 + y;
  else if (era === "昭和") year = 1925 + y;
  else if (era === "大正") year = 1911 + y;
  return `${year}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// ── 1ページ分のリンク取得 ────────────────────────────
async function fetchOnePage(page, base, lawName, query2, sort, offset) {
  const q2 = query2 ? `&query2=${encodeURIComponent(query2)}` : "";
  const url = `${base}?query1=${encodeURIComponent(lawName)}${q2}&sort=${sort}&offset=${offset}#searched`;
  const isSearch7 = base.includes("search7");
  const selector = isSearch7 ? "a[href*='hanrei-pdf-']" : "a[href*='/detail']";

  // ERR_NETWORK_IO_SUSPENDED 対策: 最大3回リトライ
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      break;
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }

  try {
    await page.waitForSelector(selector, { timeout: 8000 });
  } catch {
    return [];
  }

  if (isSearch7) {
    const links = await page.$$eval("a[href*='hanrei-pdf-']", (els) =>
      els.map((el) => ({
        href: el.getAttribute("href"),
        text: el.closest("tr,li,div")?.textContent?.trim() ?? "",
      }))
    );
    return links
      .map((l) => {
        const m = l.href.match(/hanrei-pdf-(\d+)/);
        return m ? { id: m[1], text: l.text.slice(0, 80) } : null;
      })
      .filter(Boolean)
      .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
  }

  const links = await page.$$eval("a[href*='/detail']", (els) =>
    els
      .filter(el => /\/\d+\/detail\d+\//.test(el.getAttribute("href") ?? ""))
      .map((el) => ({ href: el.getAttribute("href"), text: el.textContent.trim() }))
  );
  return links
    .map((l) => {
      const m = l.href.match(/\/(\d+)\/detail(\d+)\//);
      return m ? { id: m[1], detailType: m[2], text: l.text } : null;
    })
    .filter(Boolean)
    .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
}

// ── 全ページをページネーションで取得 ────────────────
async function fetchAllPages(page, base, lawName, query2 = "", sort = "1") {
  const results = [];
  const seen = new Set();
  let offset = 0;

  while (results.length < MAX_TOTAL) {
    const pageLinks = await fetchOnePage(page, base, lawName, query2, sort, offset);
    let newCount = 0;
    for (const link of pageLinks) {
      if (!seen.has(link.id)) {
        seen.add(link.id);
        results.push(link);
        newCount++;
      }
    }
    if (newCount === 0 || pageLinks.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }
  return results;
}

// ── 法律ごとの検索戦略 ───────────────────────────────
async function searchCases(page, searchQuery, lawId) {
  const [q1, q2 = ""] = searchQuery.split("|");

  if (IP_LAW_IDS.has(lawId)) {
    const r = await fetchAllPages(page, SEARCH_IP, q1, q2, "2");
    if (r.length > 0) return r;
  }

  const r2 = await fetchAllPages(page, SEARCH_SAIKOSAI, q1, q2);
  if (r2.length > 0) return r2;

  const r3 = await fetchAllPages(page, SEARCH_KOUSAI, q1, q2);
  return r3;
}

// ── 詳細ページ取得 ───────────────────────────────────
async function fetchDetail(page, caseId, detailType = "2") {
  const fetchOne = async (type) => {
    const url = `${DETAIL_BASE}/${caseId}/detail${type}/index.html`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    return page.evaluate(() => {
      const fields = {};
      const rows = document.querySelectorAll("dt, dd");
      let lastKey = "";
      rows.forEach((el) => {
        if (el.tagName === "DT") {
          lastKey = el.textContent.trim();
        } else if (el.tagName === "DD" && lastKey) {
          fields[lastKey] = el.textContent.replace(/\s+/g, " ").trim();
        }
      });
      return fields;
    });
  };

  const sourceUrl = `${DETAIL_BASE}/${caseId}/detail${detailType}/index.html`;
  const data = await fetchOne(detailType);
  if (detailType !== "2" && !data["判示事項"] && !data["裁判要旨"] && !data["要旨"]) {
    const data2 = await fetchOne("2");
    if (data2["判示事項"] || data2["裁判要旨"] || data2["要旨"]) {
      data2["_source"] = `${DETAIL_BASE}/${caseId}/detail2/index.html`;
      return data2;
    }
  }
  data["_source"] = sourceUrl;
  return data;
}

function buildCase(raw) {
  return {
    title:        raw["事件名"] ?? "不明",
    court:        raw["法廷名"] ?? raw["裁判所名・部"] ?? raw["裁判所名"] ?? "最高裁判所",
    date:         parseDate(raw["裁判年月日"] ?? ""),
    citation:     raw["判例集等巻・号・頁"] ?? raw["事件番号"] ?? "",
    article:      raw["参照法条"] ?? "",
    summary:      raw["判示事項"] ?? raw["判示事項の要旨"] ?? raw["主な争点"] ?? "",
    holding:      raw["裁判要旨"] ?? raw["要旨"] ?? "",
    significance: "",
    source:       raw["_source"] ?? "",
  };
}

// ── メイン ───────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const missingOnly = args.includes("--missing");
  const minCasesArg = args.find((a) => a.startsWith("--min-cases="));
  const minCases = minCasesArg ? parseInt(minCasesArg.split("=")[1]) : 0;
  const targetLawId = args.find((a) => !a.startsWith("--"));
  const laws = extractLaws();
  const targets = targetLawId
    ? laws.filter((l) => l.id === targetLawId)
    : laws.filter((l) => l.egov_id);

  console.log(`対象: ${targets.length}件の法律  force=${force} missing=${missingOnly} min-cases=${minCases}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let saved = 0, skipped = 0, failed = 0;

  for (const law of targets) {
    const searchQuery = SEARCH_OVERRIDES[law.id] ?? law.name;
    const existingCount = await dbCount(law.id);

    // --min-cases=N: N件以上あればスキップ（途中再開用）
    if (minCases > 0 && existingCount >= minCases) {
      skipped++;
      continue;
    }
    if (!force && !missingOnly && !targetLawId && minCases === 0 && existingCount > 0) {
      skipped++;
      continue;
    }
    if (missingOnly && existingCount > 0) {
      skipped++;
      continue;
    }

    process.stdout.write(`  ${law.name}${searchQuery !== law.name ? ` (→${searchQuery})` : ""}... `);

    try {
      const caseLinks = await searchCases(page, searchQuery, law.id);
      if (caseLinks.length === 0) {
        console.log("0件");
        failed++;
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }

      const cases = [];
      for (const link of caseLinks) {
        try {
          const raw = await fetchDetail(page, link.id, link.detailType ?? "2");
          const c = buildCase(raw);
          if (c.summary || c.holding) cases.push(c);
          await new Promise((r) => setTimeout(r, 500));
        } catch {
          // skip
        }
      }

      if (cases.length > 0) {
        await dbReplace(law.id, cases);
        console.log(`${cases.length}件 (リンク${caseLinks.length}件)`);
        saved++;
      } else {
        console.log("有効な判例なし");
        failed++;
      }
    } catch (e) {
      console.log(`エラー: ${e.message.slice(0, 60)}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  await browser.close();
  console.log(`\n✅ 完了: 保存=${saved}, スキップ=${skipped}, 失敗=${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
