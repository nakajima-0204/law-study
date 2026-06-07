import { fetchLawArticles } from "@/lib/egov";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const egov_id = searchParams.get("egov_id");
  const q = searchParams.get("q")?.toLowerCase() ?? "";

  if (!egov_id) return Response.json([], { status: 400 });

  let articles;
  const staticPath = join(process.cwd(), "data", "articles", `${egov_id}.json`);
  if (existsSync(staticPath)) {
    articles = JSON.parse(readFileSync(staticPath, "utf-8"));
  } else {
    articles = await fetchLawArticles(egov_id);
  }

  const filtered = q
    ? articles.filter(
        (a: { title: string; text: string }) =>
          a.title.toLowerCase().includes(q) || a.text.toLowerCase().includes(q)
      )
    : articles;

  return Response.json(q ? filtered.slice(0, 50) : filtered);
}
