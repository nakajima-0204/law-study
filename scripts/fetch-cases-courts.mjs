/**
 * courts.go.jp から最高裁判例を取得して data/cases/[lawId].json に保存する。
 * 実行: node scripts/fetch-cases-courts.mjs [lawId]
 *   lawId 省略時: egov_id を持つ全法律を処理
 */

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "cases");
const LAWS_TS = join(ROOT, "lib", "laws.ts");
const OVERRIDES_PATH = join(__dirname, "case-search-overrides.json");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const SEARCH_OVERRIDES = existsSync(OVERRIDES_PATH)
  ? JSON.parse(readFileSync(OVERRIDES_PATH, "utf-8"))
  : {};

const SEARCH_SAIKOSAI  = "https://www.courts.go.jp/hanrei/search2/index.html"; // 最高裁
const SEARCH_KOUSAI    = "https://www.courts.go.jp/hanrei/search3/index.html"; // 高等裁判所
const SEARCH_IP        = "https://www.courts.go.jp/hanrei/search7/index.html"; // 知的財産事件
const DETAIL_BASE = "https://www.courts.go.jp/hanrei";
const MAX_CASES = 10;
const DELAY_MS = 1500;

// 知的財産系は search7 を優先
const IP_LAW_IDS = new Set(["tokkyo","jitsuyoann","isho","shouhyo","chosakuken","fusei-kyoso","benrishi"]);


function extractLaws() {
  const ts = readFileSync(LAWS_TS, "utf-8");
  const laws = [];
  const seen = new Set();
  // 1行に収まっている law オブジェクトのみ抽出（ネスト構造を避ける）
  for (const line of ts.split("\n")) {
    const m = line.match(/\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*egov_id:\s*"([^"]+)"\s*\}/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      laws.push({ id: m[1], name: m[2], egov_id: m[3] });
    }
  }
  return laws;
}

function parseDate(str) {
  // 令和X年X月X日 → YYYY-MM-DD
  const m = str.match(/(令和|平成|昭和|大正)(\d+)年(\d+)月(\d+)日/);
  if (!m) return str;
  const era = m[1], y = parseInt(m[2]), mo = parseInt(m[3]), d = parseInt(m[4]);
  let year = y;
  if (era === "令和") year = 2018 + y;
  else if (era === "平成") year = 1988 + y;
  else if (era === "昭和") year = 1925 + y;
  else if (era === "大正") year = 1911 + y;
  return `${year}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

async function searchOneBase(page, base, lawName, query2 = "") {
  const q2 = query2 ? `&query2=${encodeURIComponent(query2)}` : "";
  const url = `${base}?query1=${encodeURIComponent(lawName)}${q2}&sort=1&offset=0#searched`;
  const isSearch7 = base.includes("search7");
  const selector = isSearch7 ? "a[href*='hanrei-pdf-']" : "a[href*='/detail2/']";

  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  try {
    await page.waitForSelector(selector, { timeout: 8000 });
  } catch {
    return [];
  }

  if (isSearch7) {
    // search7: PDF リンクからIDを抽出 (hanrei-pdf-XXXXX.pdf → XXXXX)
    const links = await page.$$eval("a[href*='hanrei-pdf-']", (els) =>
      els.slice(0, 20).map((el) => ({
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

  // search2/search3: detail2/detail3/detail4/detail7 すべてを捕捉
  const links = await page.$$eval("a[href*='/detail']", (els) =>
    els
      .filter(el => /\/\d+\/detail\d+\//.test(el.getAttribute("href") ?? ""))
      .slice(0, 20)
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

// searchQuery は "query1" or "query1|query2" 形式
async function searchCases(page, searchQuery, lawId) {
  const [q1, q2 = ""] = searchQuery.split("|");

  // 知財系は search7 から試す
  if (IP_LAW_IDS.has(lawId)) {
    const r = await searchOneBase(page, SEARCH_IP, q1, q2);
    if (r.length > 0) return r.slice(0, MAX_CASES);
  }

  // 最高裁（search2）
  const r2 = await searchOneBase(page, SEARCH_SAIKOSAI, q1, q2);
  if (r2.length > 0) return r2.slice(0, MAX_CASES);

  // 高裁（search3）にフォールバック
  const r3 = await searchOneBase(page, SEARCH_KOUSAI, q1, q2);
  return r3.slice(0, MAX_CASES);
}

async function fetchDetail(page, caseId, detailType = "2") {
  const url = `${DETAIL_BASE}/${caseId}/detail${detailType}/index.html`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

  const data = await page.evaluate(() => {
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

  return data;
}

function buildCase(raw) {
  const court = raw["法廷名"] ?? raw["裁判所名・部"] ?? "最高裁判所";
  const date = raw["裁判年月日"] ?? "";
  const citation = raw["判例集等巻・号・頁"] ?? "";
  const caseNum = raw["事件番号"] ?? "";

  let citationStr = citation || caseNum;

  return {
    title: raw["事件名"] ?? "不明",
    court,
    date: parseDate(date),
    citation: citationStr,
    article: raw["参照法条"] ?? "",
    summary: raw["判示事項"] ?? raw["判示事項の要旨"] ?? "",
    holding: raw["裁判要旨"] ?? "",
    significance: "",
    source: "",
  };
}

async function main() {
  const args = process.argv.slice(2);
  const missingOnly = args.includes("--missing");
  const targetLawId = args.find((a) => !a.startsWith("--"));
  const laws = extractLaws();
  const targets = targetLawId
    ? laws.filter((l) => l.id === targetLawId)
    : laws.filter((l) => l.egov_id);

  console.log(`対象: ${targets.length}件の法律${missingOnly ? " (未取得のみ)" : ""}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const law of targets) {
    const outPath = join(OUT_DIR, `${law.id}.json`);

    // --missing モード: 既存ファイルがある場合はスキップ
    // 通常モード: 既存ファイルがある場合はスキップ（targetLawId指定時は上書き）
    if (existsSync(outPath) && !targetLawId) {
      skipped++;
      continue;
    }
    // --missing モード: 既存ファイルがあればスキップ（targetLawId指定時でも）
    if (missingOnly && existsSync(outPath)) {
      skipped++;
      continue;
    }

    const searchQuery = SEARCH_OVERRIDES[law.id] ?? law.name;
    process.stdout.write(`  ${law.name}${searchQuery !== law.name ? ` (→ ${searchQuery})` : ""}... `);

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
          // 判示事項または裁判要旨がある場合のみ追加
          if (c.summary || c.holding) {
            cases.push(c);
          }
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          // skip this case
        }
      }

      if (cases.length > 0) {
        writeFileSync(outPath, JSON.stringify(cases, null, 2) + "\n");
        console.log(`${cases.length}件`);
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
