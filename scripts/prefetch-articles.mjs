/**
 * e-Gov から全法律の条文を取得して data/articles/[egov_id].json に保存する。
 * 初回セットアップ時 & GitHub Actions で週1回実行。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "articles");
const LAWS_TS = join(ROOT, "lib", "laws.ts");
const EGOV_BASE = "https://laws.e-gov.go.jp/api/1";

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

function extractLaws() {
  const ts = readFileSync(LAWS_TS, "utf-8");
  const laws = [];
  const seen = new Set();
  // { id: "...", name: "...", egov_id: "..." } の全パターンを抽出
  for (const m of ts.matchAll(/\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*egov_id:\s*"([^"]+)"\s*\}/g)) {
    if (!seen.has(m[3])) {
      seen.add(m[3]);
      laws.push({ id: m[1], name: m[2], egov_id: m[3] });
    }
  }
  return laws;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function parseArticles(xml) {
  const articles = [];
  for (const block of xml.matchAll(/<Article\s+Num="([^"]+)">([\s\S]*?)<\/Article>/g)) {
    const num = block[1];
    const inner = block[2];
    const titleMatch = inner.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
    const title = titleMatch ? stripTags(titleMatch[1]) : `第${num}条`;
    const paragraphs = [];
    for (const p of inner.matchAll(/<Paragraph\b[^>]*>([\s\S]*?)<\/Paragraph>/g)) {
      const text = stripTags(p[1]).trim();
      if (text) paragraphs.push(text);
    }
    if (paragraphs.length > 0) {
      articles.push({ num, title, text: paragraphs.join("\n"), paragraphs });
    }
  }
  return articles;
}

async function fetchArticles(egov_id) {
  const res = await fetch(`${EGOV_BASE}/lawdata/${egov_id}`);
  if (!res.ok) return null;
  const xml = await res.text();
  return parseArticles(xml);
}

async function main() {
  const laws = extractLaws();
  console.log(`対象: ${laws.length}件の法律`);

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const law of laws) {
    const outPath = join(OUT_DIR, `${law.egov_id}.json`);
    process.stdout.write(`  ${law.name} (${law.egov_id})... `);

    try {
      const articles = await fetchArticles(law.egov_id);
      if (!articles || articles.length === 0) {
        console.log("条文なし");
        failed++;
      } else {
        writeFileSync(outPath, JSON.stringify(articles, null, 2) + "\n");
        console.log(`${articles.length}条`);
        saved++;
      }
    } catch (e) {
      console.log(`エラー: ${e.message}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ 完了: 保存=${saved}, 失敗=${failed}, スキップ=${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
