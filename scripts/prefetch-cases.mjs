/**
 * 全法律の重要判例（最判）を Gemini + Google Search で生成して
 * data/cases/[lawId].json に保存する。
 * 初回セットアップ時 & GitHub Actions で週1回実行。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "cases");
const LAWS_TS = join(ROOT, "lib", "laws.ts");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash"; // バッチ処理用（高速・安定）

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

function extractLaws() {
  const ts = readFileSync(LAWS_TS, "utf-8");
  const laws = [];
  // egov_id ありのみ（実定法）
  for (const m of ts.matchAll(/\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*egov_id:\s*"([^"]+)"\s*\}/g)) {
    laws.push({ id: m[1], name: m[2] });
  }
  const seen = new Set();
  return laws.filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
}

const CASE_SCHEMA = `[{"title":"判例の通称・事件名","court":"裁判所名","date":"判決日","citation":"引用情報","article":"関連条文","summary":"事案概要（2〜3文）","holding":"判旨・要旨（2〜3文）","significance":"重要性（1〜2文）","source":"参照URL"}]`;

async function fetchLandmarkCases(lawName) {
  const prompt = `${lawName}の重要判例・最高裁判例を3〜5件、以下のJSON配列のみで返してください（説明不要）：
${CASE_SCHEMA}
選定基準：法学教科書必出・実務影響大・法解釈確立の判例。参照先：https://www.courts.go.jp/app/hanrei_jp/search1`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();

  // candidatesからtextのみ抽出（思考ブロック等を除外）
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text)
    .join("");

  if (!text) {
    throw new Error(`レスポンスにテキストなし: ${JSON.stringify(data).slice(0, 300)}`);
  }

  // JSON配列を抽出（```json ... ``` やコメントを含む場合も対応）
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) {
    throw new Error(`JSON配列なし。レスポンス: ${text.slice(0, 300)}`);
  }

  return JSON.parse(match[0]);
}

async function main() {
  if (!GEMINI_API_KEY) { console.error("GEMINI_API_KEY が未設定"); process.exit(1); }

  const laws = extractLaws();
  console.log(`対象: ${laws.length}件の法律`);

  const force = process.argv.includes("--force");
  let saved = 0, skipped = 0, failed = 0;

  for (const law of laws) {
    const outPath = join(OUT_DIR, `${law.id}.json`);
    if (!force && existsSync(outPath)) {
      console.log(`  ${law.name} → スキップ（既存）`);
      skipped++;
      continue;
    }

    process.stdout.write(`  ${law.name}... `);
    try {
      const cases = await fetchLandmarkCases(law.name);
      if (!cases || cases.length === 0) {
        console.log("0件（スキップ）");
        failed++;
      } else {
        writeFileSync(outPath, JSON.stringify(cases, null, 2) + "\n");
        console.log(`${cases.length}件`);
        saved++;
      }
    } catch (e) {
      console.log(`エラー: ${e.message}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n✅ 完了: 保存=${saved}, スキップ=${skipped}, 失敗=${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
