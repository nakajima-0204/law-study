/**
 * e-Gov APIで各法律の最新改正日を取得し、DB更新・新改正フラグを立てる
 * Usage: node scripts/check-law-revisions.mjs
 */

import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

// 環境変数ロード
function loadEnv() {
  for (const f of [".env.local", ".env.production.local", ".env.vercel.local"]) {
    try {
      readFileSync(f, "utf8").split("\n").forEach((line) => {
        const eq = line.indexOf("=");
        if (eq <= 0) return;
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (k && v && !process.env[k]) process.env[k] = v;
      });
    } catch {}
  }
}
loadEnv();

const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);

// 元号→西暦変換
function parseJpDate(str) {
  const m = str.match(/(令和|平成|昭和|大正|明治)(\d+)年(\d+)月(\d+)日/);
  if (!m) return null;
  const era = { 令和: 2018, 平成: 1988, 昭和: 1925, 大正: 1911, 明治: 1867 };
  const year = era[m[1]] + parseInt(m[2]);
  return `${year}-${String(m[3]).padStart(2, "0")}-${String(m[4]).padStart(2, "0")}`;
}

// e-Gov XMLから最新改正日と改正法令名を取得
async function fetchLatestAmend(egov_id) {
  try {
    const res = await fetch(`https://laws.e-gov.go.jp/api/1/lawdata/${egov_id}`, {
      headers: { "User-Agent": "Themisia-LawRevisionChecker/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const xml = await res.text();

    const matches = [...xml.matchAll(/AmendLawNum="([^"]+)"/g)];
    if (matches.length === 0) return null;

    const parsed = matches
      .map((m) => ({ raw: m[1], date: parseJpDate(m[1]) }))
      .filter((x) => x.date)
      .sort((a, b) => b.date.localeCompare(a.date));

    return parsed[0] ?? null;
  } catch {
    return null;
  }
}

// LAW_DOMAINSからegov_id付きの法律を列挙
async function getAllLawsWithEgov() {
  // laws.ts をJSONとして読めないので、直接importできる形で取り出す
  const src = readFileSync("lib/laws.ts", "utf8");
  const laws = [];
  const lawMatches = src.matchAll(/\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*egov_id:\s*"([^"]+)"\s*\}/g);
  for (const m of lawMatches) {
    laws.push({ id: m[1], name: m[2], egov_id: m[3] });
  }
  return laws;
}

async function main() {
  const laws = await getAllLawsWithEgov();
  console.log(`📋 チェック対象: ${laws.length}件`);

  let updated = 0;
  let newRevisions = 0;

  for (let i = 0; i < laws.length; i++) {
    const { id, name, egov_id } = laws[i];
    process.stdout.write(`  [${i + 1}/${laws.length}] ${name.slice(0, 30).padEnd(30)} `);

    const latest = await fetchLatestAmend(egov_id);
    if (!latest) {
      console.log("⏭️ スキップ");
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    // 既存レコード取得
    const existing = await sql`
      SELECT last_amend_date FROM law_revisions WHERE law_id = ${id}
    `;

    if (existing.length === 0) {
      // 初回登録
      await sql`
        INSERT INTO law_revisions (law_id, egov_id, law_name, last_amend_date, last_amend_law, is_new)
        VALUES (${id}, ${egov_id}, ${name}, ${latest.date}, ${latest.raw}, false)
      `;
      console.log(`📝 初回登録 ${latest.date}`);
    } else {
      const prevDate = existing[0].last_amend_date?.toISOString?.()?.slice(0, 10) ?? "";
      if (latest.date > prevDate) {
        // 改正検出！
        await sql`
          UPDATE law_revisions
          SET last_amend_date = ${latest.date},
              last_amend_law = ${latest.raw},
              prev_amend_date = ${prevDate},
              checked_at = NOW(),
              is_new = true
          WHERE law_id = ${id}
        `;
        console.log(`🔔 改正検出！ ${prevDate} → ${latest.date}`);
        newRevisions++;
      } else {
        await sql`
          UPDATE law_revisions SET checked_at = NOW() WHERE law_id = ${id}
        `;
        console.log(`✅ 変更なし ${latest.date}`);
      }
    }
    updated++;
    await new Promise((r) => setTimeout(r, 500)); // e-Gov API負荷軽減
  }

  console.log(`\n✅ 完了: チェック=${updated}, 新改正=${newRevisions}`);
}

main().catch(console.error);
