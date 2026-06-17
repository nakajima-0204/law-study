import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT law_id, law_name, last_amend_date, last_amend_law, prev_amend_date, checked_at
      FROM law_revisions
      WHERE is_new = true
      ORDER BY last_amend_date DESC
      LIMIT 20
    `;
    return Response.json(rows);
  } catch {
    return Response.json([]);
  }
}

// 既読にする（法律ページを開いたとき）
export async function POST(req: Request) {
  const { lawId } = await req.json();
  if (!lawId) return Response.json({ ok: false });
  try {
    await sql`
      UPDATE law_revisions SET is_new = false WHERE law_id = ${lawId}
    `;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}
