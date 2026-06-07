import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/model";
import { LAW_DOMAINS } from "@/lib/laws";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const ALL_LAWS = LAW_DOMAINS.flatMap((d) =>
  d.categories.flatMap((c) =>
    c.laws.map((l) => ({ id: l.id, name: l.name, domain: d.name, category: c.name }))
  )
);

const LAW_LIST_TEXT = ALL_LAWS.map((l) => `${l.id}: ${l.name}（${l.domain} > ${l.category}）`).join("\n");

export async function POST(req: Request) {
  const { query } = await req.json();
  if (!query?.trim()) return Response.json([]);

  const lower = query.toLowerCase();
  const quickMatches = ALL_LAWS.filter(
    (l) =>
      l.name.includes(query) ||
      l.name.toLowerCase().includes(lower) ||
      l.category.includes(query) ||
      l.domain.includes(query)
  ).slice(0, 5);

  const prompt = `ユーザーが「${query}」と検索しました。

以下の法律リストから、この検索に関連する法律を最大5件選んでください。
法律名の部分一致だけでなく、関連するキーワード・法律概念・事例・状況からも判断してください。

例：
- 「離婚」→ 民法（親族・相続）、DV防止法、家事事件手続法
- 「解雇」→ 労働契約法、労働基準法、労働審判法
- 「著作権侵害」→ 著作権法、不正競争防止法
- 「交通事故」→ 民法（不法行為）、道路交通法

【法律リスト】
${LAW_LIST_TEXT}

以下のJSON配列形式のみで返してください：
[
  {
    "id": "law_id",
    "name": "法律名",
    "reason": "関連する理由（10〜20文字）"
  }
]

JSONのみ返してください。`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });

    const text = response.text ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return Response.json(quickMatches.map((l) => ({ ...l, reason: "名称一致" })));

    const aiResults: { id: string; name: string; reason: string }[] = JSON.parse(match[0]);

    const seen = new Set(aiResults.map((r) => r.id));
    const merged = [
      ...aiResults,
      ...quickMatches
        .filter((l) => !seen.has(l.id))
        .map((l) => ({ id: l.id, name: l.name, reason: "名称一致" })),
    ].slice(0, 6);

    return Response.json(merged);
  } catch {
    return Response.json(quickMatches.map((l) => ({ ...l, reason: "名称一致" })));
  }
}
