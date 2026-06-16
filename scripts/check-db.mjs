import pkg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const { rows: total } = await pool.query("SELECT COUNT(*) as total, COUNT(DISTINCT law_id) as laws FROM cases");
console.log(`総件数: ${total[0].total} / 法律数: ${total[0].laws}`);

const { rows: low } = await pool.query(
  "SELECT law_id, COUNT(*) as cnt FROM cases GROUP BY law_id HAVING COUNT(*) < 20 ORDER BY COUNT(*)"
);
console.log(`\n20件未満の法律: ${low.length}件`);
low.forEach(r => console.log(`  ${r.law_id}: ${r.cnt}件`));

await pool.end();
