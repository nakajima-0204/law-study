/**
 * ECHR HUDOC 無料REST API から重要判例を取得して Neon DB に保存する。
 * 実行: node scripts/fetch-cases-hudoc.mjs [lawId] [--force]
 *   lawId 省略時: 全対象法律を処理
 *   --force  : DB に既存データがあっても再取得する
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const HUDOC_API = "https://hudoc.echr.coe.int/app/query/results";

/**
 * 法律ID → HUDOCクエリマッピング
 * articles: 欧州人権条約の条文番号
 * keywords: 全文検索キーワード（空白区切りはOR扱い）
 */
const LAW_HUDOC_MAP = {
  // 国際人権法
  "jiyuken-kitei":      { articles: ["5","6","7","8","9","10","11","13","14"], label: "自由権規約（ICCPR）" },
  "gomon-kinshi":       { articles: ["3"], label: "拷問等禁止条約（CAT）" },
  "joshi-sabetsu":      { articles: ["14"], keywords: "women gender discrimination", label: "女性差別撤廃条約（CEDAW）" },
  "jinshu-sabetsu":     { articles: ["14"], keywords: "racial ethnic discrimination", label: "人種差別撤廃条約（ICERD）" },
  "kodomo-kenri":       { keywords: "children juvenile minor", label: "子どもの権利条約（CRC）" },
  "shogaisha-kenri":    { keywords: "disability disabled", label: "障害者権利条約（CRPD）" },
  "nanmin-joyaku2":     { articles: ["3"], keywords: "expulsion deportation asylum refugee", label: "難民条約" },
  "kokusai-jinken-kouki": { articles: ["6","8","10"], label: "国際人権規約（国内適用）" },
  "kokusai-jinken-kikan": { keywords: "individual application petition communication", label: "国際人権機関への個人通報制度" },
  "ianfu-mondai":       { articles: ["3"], keywords: "sexual slavery forced labor servitude", label: "慰安婦問題と国際人権法" },
  // 国際人道法
  "geneva":             { keywords: "armed conflict war prisoner detention", label: "ジュネーブ諸条約" },
  "kakuheiki":          { articles: ["2","3"], keywords: "nuclear weapons", label: "核兵器禁止条約" },
  // 表現の自由・プライバシー（人権法）
  "hyougen-kisei":      { articles: ["10"], label: "表現の自由（欧州人権条約10条）" },
  "houdou-jiyuu":       { articles: ["10"], keywords: "press journalist media", label: "報道の自由" },
  "name-erase":         { articles: ["8"], keywords: "data protection right to be forgotten", label: "忘れられる権利（ECHR）" },
  "privacy-ko":         { articles: ["8"], label: "プライバシー権（欧州人権条約8条）" },
  // 差別禁止
  "gender-saiban":      { articles: ["14"], keywords: "sexual orientation LGBT transgender", label: "ジェンダー・LGBTと人権" },
  "gender-kokusai":     { articles: ["14"], keywords: "gender equality women", label: "国際的なジェンダー平等規範" },
  // EU法
  "eu-law":             { articles: ["6","8","10"], label: "EU法・欧州人権条約" },
  // 時事トピック
  "sensou-kokusaiho":   { articles: ["2","3"], keywords: "armed conflict killing", label: "現代の紛争と国際人道法" },
  "cyber-anpo":         { articles: ["8"], keywords: "surveillance internet", label: "サイバー安全保障と国際法" },
  "climate-sosho-intl": { keywords: "environment climate", label: "気候変動訴訟の国際動向" },
};

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

async function dbReplace(lawId, cases) {
  const pool = makePool();
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM cases WHERE law_id = $1", [lawId]);
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

// ── HUDOC API ────────────────────────────────────────────────────
async function fetchHUDOC(mapping, maxResults = 50) {
  // HUDOC クエリ構文:
  //   field:"value"  → 部分一致（セミコロン区切りの多値フィールドに使用）
  //   field=="value" → 完全一致
  const parts = [
    `(contentsitename=="ECHR")`,
    `(documentcollectionid2:"GRANDCHAMBER" OR documentcollectionid2:"CHAMBER")`,
    `(importance=="1" OR importance=="2")`,
  ];

  if (mapping.articles?.length > 0) {
    // article フィールドは "3;3-1;41;6;..." 形式のセミコロン区切り文字列
    // "3" で部分一致させると "35" にもマッチするため、セミコロン区切り境界を意識した OR クエリにする
    const artFilter = mapping.articles.map(a => `article:"${a}"`).join(" OR ");
    parts.push(`(${artFilter})`);
  }
  if (mapping.keywords) {
    parts.push(`(${mapping.keywords})`);
  }

  const params = new URLSearchParams({
    query: parts.join(" AND "),
    select: "itemid,docname,kpdate,conclusion,importance,respondent,violation,nonviolation,article,ecli",
    sort: "importance Ascending,kpdate Descending",
    start: "0",
    length: String(maxResults),
  });

  const res = await fetch(`${HUDOC_API}?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`HUDOC ${res.status}: ${await res.text().then(t => t.slice(0,200))}`);
  const data = await res.json();
  return data.results ?? [];
}

function parseField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  // "3;3-1;41;6;6-1" → ["3","3-1","41","6","6-1"]
  return String(val).split(";").map(s => s.trim()).filter(Boolean);
}

function buildCase(result) {
  const c = result.columns ?? result;
  const title = (c.docname ?? "").replace(/^(CASE OF |AFFAIRE )/, "");
  const date = c.kpdate ? c.kpdate.split("T")[0] : "";

  // 主条文（枝番除く、重複除く、上位5件）
  const rawArticles = parseField(c.article)
    .filter(a => /^\d+$/.test(a))   // "3" "6" "10" など数字のみ
    .filter((a, i, arr) => arr.indexOf(a) === i)
    .slice(0, 5);

  const violations = parseField(c.violation)
    .filter(a => /^\d+$/.test(a))
    .filter((a, i, arr) => arr.indexOf(a) === i);

  const nonViolations = parseField(c.nonviolation)
    .filter(a => /^\d+$/.test(a))
    .filter((a, i, arr) => arr.indexOf(a) === i);

  const conclusion = c.conclusion ?? "";
  const itemId = c.itemid ?? "";
  const appNo = itemId.replace("001-", "");

  let significance = "";
  if (violations.length > 0) significance += `第${violations.join("・")}条違反`;
  if (nonViolations.length > 0) significance += (significance ? "、" : "") + `第${nonViolations.join("・")}条非違反`;
  if (c.importance === "1") significance = (significance ? significance + "。" : "") + "大法廷判決・リーディングケース";

  return {
    title: `${title}${c.respondent ? ` v. ${c.respondent}` : ""}`,
    court: "欧州人権裁判所（ECHR）",
    date,
    citation: `App. No. ${appNo}`,
    article: rawArticles.length > 0 ? `欧州人権条約第${rawArticles.join("・")}条` : "",
    summary: conclusion.slice(0, 600),
    holding: conclusion,
    significance: significance || "ECHR重要判例",
    source: `https://hudoc.echr.coe.int/eng?i=${itemId}`,
  };
}

// ── メイン ───────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const targetId = args.find(a => !a.startsWith("--"));

  const targets = targetId
    ? Object.entries(LAW_HUDOC_MAP).filter(([id]) => id === targetId)
    : Object.entries(LAW_HUDOC_MAP);

  console.log(`\n🌍 ECHR HUDOC 判例取込  対象: ${targets.length}件\n`);

  let saved = 0, skipped = 0, failed = 0;

  for (const [lawId, mapping] of targets) {
    const existing = await dbCount(lawId);
    if (!force && existing > 0) {
      console.log(`  ⏭  ${lawId}: スキップ（${existing}件存在）`);
      skipped++;
      continue;
    }

    process.stdout.write(`  📥 ${lawId} (${mapping.label})... `);
    try {
      const results = await fetchHUDOC(mapping, 50);
      if (results.length === 0) {
        console.log("0件（クエリを確認してください）");
        failed++;
        continue;
      }
      const cases = results.map(buildCase).filter(c => c.title && c.title.length > 1);
      await dbReplace(lawId, cases);
      console.log(`✅ ${cases.length}件保存`);
      saved++;
    } catch (e) {
      console.log(`❌ エラー: ${e.message.slice(0, 80)}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n✅ 完了: 保存=${saved}, スキップ=${skipped}, 失敗=${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
