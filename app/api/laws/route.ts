export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const lawId = searchParams.get("lawId");

  if (!query || !lawId) {
    return Response.json({ error: "q and lawId are required" }, { status: 400 });
  }

  const egov_url = `https://laws.e-gov.go.jp/api/1/articles;${encodeURIComponent(query)}`;

  try {
    const res = await fetch(egov_url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: "e-Gov APIの取得に失敗しました" }, { status: 500 });
  }
}
