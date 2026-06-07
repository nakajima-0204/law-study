import { fetchLawArticles } from "@/lib/egov";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const egov_id = searchParams.get("egov_id");
  const q = searchParams.get("q")?.toLowerCase() ?? "";

  if (!egov_id) return Response.json([], { status: 400 });

  const articles = await fetchLawArticles(egov_id);

  const filtered = q
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.text.toLowerCase().includes(q)
      )
    : articles;

  return Response.json(filtered.slice(0, 50));
}
