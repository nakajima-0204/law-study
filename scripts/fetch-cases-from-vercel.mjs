/**
 * Vercel本番のAPIエンドポイント経由で判例を取得して data/cases/ に保存する。
 * 本番のGEMINI_API_KEYを使うためクォータ問題を回避。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "cases");
const LAWS_TS = join(ROOT, "lib", "laws.ts");

const BASE_URL = "https://law-study-phi.vercel.app";
const TOKEN = "themisia-admin-2026";
const DELAY_MS = 2000;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

function extractLaws() {
  const ts = readFileSync(LAWS_TS, "utf-8");
  const laws = [];
  for (const m of ts.matchAll(/\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*egov_id:\s*"([^"]+)"\s*\}/g)) {
    laws.push({ id: m[1], name: m[2] });
  }
  const seen = new Set();
  return laws.filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
}

async function main() {
  const laws = extractLaws();
  const total = laws.length;
  const force = process.argv.includes("--force");
  console.log(`対象: ${total}件の法律`);

  let saved = 0, skipped = 0, failed = 0;

  for (let i = 0; i < laws.length; i++) {
    const law = laws[i];
    const pct = Math.round(((i + 1) / total) * 100);
    const outPath = join(OUT_DIR, `${law.id}.json`);

    if (!force && existsSync(outPath)) {
      console.log(`  [${pct}%] ${law.name} → スキップ（既存）`);
      skipped++;
      continue;
    }

    process.stdout.write(`  [${pct}%] ${law.name}... `);

    try {
      const url = `${BASE_URL}/api/admin/gen-cases?token=${TOKEN}&law=${encodeURIComponent(law.name)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.log(`エラー: ${res.status} ${err.error ?? ""}`);
        failed++;
      } else {
        const cases = await res.json();
        if (!Array.isArray(cases) || cases.length === 0) {
          console.log("0件");
          failed++;
        } else {
          writeFileSync(outPath, JSON.stringify(cases, null, 2) + "\n");
          console.log(`${cases.length}件`);
          saved++;
        }
      }
    } catch (e) {
      console.log(`エラー: ${e.message}`);
      failed++;
    }

    if (i < laws.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n✅ 完了: 保存=${saved}, スキップ=${skipped}, 失敗=${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
