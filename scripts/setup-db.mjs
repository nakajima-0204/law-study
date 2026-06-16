/**
 * DB初期化 + 既存JSONデータ移行スクリプト
 * 使い方: node scripts/setup-db.mjs
 */
import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// UNPOOLED接続でバルクインサート
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

async function createTables(client) {
  console.log("テーブル作成中...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id           SERIAL PRIMARY KEY,
      law_id       TEXT NOT NULL,
      title        TEXT NOT NULL DEFAULT '',
      court        TEXT NOT NULL DEFAULT '',
      date         TEXT NOT NULL DEFAULT '',
      summary      TEXT NOT NULL DEFAULT '',
      holding      TEXT NOT NULL DEFAULT '',
      significance TEXT NOT NULL DEFAULT '',
      citation     TEXT NOT NULL DEFAULT '',
      article      TEXT NOT NULL DEFAULT '',
      source       TEXT NOT NULL DEFAULT '',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS cases_law_id_idx ON cases(law_id)`);
  await client.query(`
    CREATE INDEX IF NOT EXISTS cases_search_idx
    ON cases USING gin(
      to_tsvector('simple',
        coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(holding,'')
      )
    )
  `);
  console.log("テーブル作成完了");
}

async function importJson(client) {
  const casesDir = join(__dirname, "..", "data", "cases");
  const files = readdirSync(casesDir).filter((f) => f.endsWith(".json"));
  console.log(`${files.length}件のJSONファイルをインポート中...`);

  let total = 0;
  for (const file of files) {
    const lawId = file.replace(".json", "");
    const raw = JSON.parse(readFileSync(join(casesDir, file), "utf-8"));
    const cases = Array.isArray(raw) ? raw : [];
    if (cases.length === 0) continue;

    // 既存データを削除（冪等）
    await client.query(`DELETE FROM cases WHERE law_id = $1`, [lawId]);

    if (cases.length === 0) continue;

    // バッチINSERT: VALUES ($1,$2,...), ($n+1,...) の形で一括挿入
    const COLS = ["law_id","title","court","date","summary","holding","significance","citation","article","source"];
    const valuePlaceholders = [];
    const values = [];
    let paramIdx = 1;

    for (const c of cases) {
      const row = [
        lawId,
        c.title ?? "",
        c.court ?? "",
        c.date ?? "",
        c.summary ?? "",
        c.holding ?? "",
        c.significance ?? "",
        c.citation ?? "",
        c.article ?? "",
        c.source ?? "",
      ];
      valuePlaceholders.push(`(${row.map(() => `$${paramIdx++}`).join(",")})`);
      values.push(...row);
    }

    const query = `INSERT INTO cases (${COLS.join(",")}) VALUES ${valuePlaceholders.join(",")}`;
    await client.query(query, values);
    total += cases.length;
    process.stdout.write(`\r${lawId}: ${cases.length}件 (累計${total}件)   `);
  }
  console.log(`\nインポート完了: 計${total}件`);
}

async function main() {
  const client = await pool.connect();
  try {
    await createTables(client);
    await importJson(client);
    const { rows } = await client.query(`SELECT COUNT(*) FROM cases`);
    console.log(`\nDB確認: cases テーブルに ${rows[0].count} 件`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
