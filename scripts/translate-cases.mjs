/**
 * ECHR/ICJ等の英語判例をGeminiで日本語化してDB更新する。
 * 実行: node scripts/translate-cases.mjs [--limit=N] [--force]
 *   --limit=N   : 1回の実行で更新する最大件数（デフォルト50）
 *   --force     : 既に日本語化済みの判例も再翻訳する
 */

import { GoogleGenAI } from "@google/genai";
import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
function loadEnv(file) {
  try {
    for (const line of readFileSync(join(__dir, "..", file), "utf-8").split("\n")) {
      const m = line.match(/^([^#\s][^=]*)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadEnv(".env.production.local");
loadEnv(".env.local");

let ai;
const INTL_COURTS = ["ECHR", "ICJ", "ICC", "ITLOS", "WTO", "ICSID", "CJEU", "SCOTUS"];
const DELAY_MS = 4000; // 無料枠 rate limit 対策（15 RPM）

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

async function fetchEnglishCases(limit, force) {
  const pool = makePool();
  try {
    // 英語判例の判定: summaryがASCII比率が高い or court名に英語裁判所名を含む
    const condition = force
      ? `court ~* '${INTL_COURTS.join("|")}'`
      : `court ~* '${INTL_COURTS.join("|")}' AND (summary_ja IS NULL OR summary_ja = '')`;
    const { rows } = await pool.query(
      `SELECT id, title, court, date, summary, holding, significance, citation, article, source
       FROM cases
       WHERE ${condition}
       LIMIT $1`,
      [limit]
    );
    return rows;
  } finally { await pool.end(); }
}

async function updateCase(id, summaryJa, holdingJa, significanceJa) {
  const pool = makePool();
  try {
    await pool.query(
      `UPDATE cases SET summary_ja=$1, holding_ja=$2, significance_ja=$3 WHERE id=$4`,
      [summaryJa, holdingJa, significanceJa, id]
    );
  } finally { await pool.end(); }
}

async function ensureColumns() {
  const pool = makePool();
  try {
    await pool.query(`
      ALTER TABLE cases
        ADD COLUMN IF NOT EXISTS summary_ja     TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS holding_ja     TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS significance_ja TEXT NOT NULL DEFAULT ''
    `);
    console.log("✅ 列追加確認完了");
  } finally { await pool.end(); }
}

// ── 翻訳 ─────────────────────────────────────────────────────────
async function translateCase(c) {
  if (!ai) ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `以下の国際裁判所判例を日本語に翻訳・要約してください。
原文が英語の場合は日本語に翻訳し、既に日本語の場合はそのまま返してください。

事件名: ${c.title}
裁判所: ${c.court}  日付: ${c.date}
引用: ${c.citation}
条文: ${c.article}

【事案概要（summary）】
${c.summary}

【判旨（holding）】
${c.holding}

【重要性（significance）】
${c.significance}

以下のJSON形式のみで返してください（コードブロック不要）:
{"summary_ja":"事案概要の日本語（200〜300字）","holding_ja":"判旨の日本語（200〜300字）","significance_ja":"この判例が国際法・比較法上持つ重要性（100〜150字）"}

JSONのみ返すこと。`;

  // 503過負荷時に最大3回リトライ
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });
    const txt = res.text ?? "";
    const isRetryable = txt.includes('"code":503') || txt.includes('"code": 503')
                     || txt.includes('"code":429') || txt.includes('"code": 429');
    if (!isRetryable) break;
    await new Promise(r => setTimeout(r, 10000 * (attempt + 1)));
  }

  const text = res.text ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`JSONパース失敗: ${text.slice(0, 100)}`);
  return JSON.parse(m[0]);
}

// ── メイン ───────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const limitArg = args.find(a => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : 50;

  await ensureColumns();

  const cases = await fetchEnglishCases(limit, force);
  console.log(`\n🌐 翻訳対象: ${cases.length}件\n`);

  let ok = 0, failed = 0;
  for (const [i, c] of cases.entries()) {
    process.stdout.write(`  [${i + 1}/${cases.length}] ${c.title.slice(0, 50)}... `);
    try {
      const t = await translateCase(c);
      await updateCase(c.id, t.summary_ja, t.holding_ja, t.significance_ja);
      console.log("✅");
      ok++;
    } catch (e) {
      console.log(`❌ ${e.message.slice(0, 60)}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n✅ 完了: 翻訳=${ok}, 失敗=${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
