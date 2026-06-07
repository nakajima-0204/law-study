import { GoogleGenAI } from "@google/genai";
import { getLawById } from "@/lib/laws";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  const { lawId, query, type } = await req.json();

  const law = getLawById(lawId);
  const lawName = law?.name ?? "法律全般";

  let prompt = "";

  if (type === "landmark") {
    prompt = `${lawName}に関する重要判例・リーディングケースを5件、最新のものを含めて教えてください。

各判例について以下のJSON配列形式で返してください：
[
  {
    "title": "判例の通称・事件名",
    "court": "裁判所名",
    "date": "判決日（例：2023年3月15日）",
    "summary": "事案の概要（2〜3文）",
    "holding": "判決の要旨・法的判断（2〜3文）",
    "significance": "この判例の重要性・実務への影響",
    "citation": "引用条文（例：民法709条）"
  }
]

必ずJSON配列のみを返してください。`;
  } else if (type === "search") {
    prompt = `${lawName}に関して「${query}」というキーワードで関連する判例・事例を3〜5件検索して教えてください。

最新の判例も含めて、以下のJSON配列形式で返してください：
[
  {
    "title": "判例の通称・事件名",
    "court": "裁判所名",
    "date": "判決日",
    "summary": "事案の概要（2〜3文）",
    "holding": "判決の要旨・法的判断（2〜3文）",
    "significance": "この判例の重要性",
    "citation": "引用条文"
  }
]

必ずJSON配列のみを返してください。`;
  } else if (type === "recent") {
    prompt = `${lawName}に関する直近2〜3年以内の新しい判例・法改正・重要な出来事を5件教えてください。

以下のJSON配列形式で返してください：
[
  {
    "title": "判例・法改正の名称",
    "court": "裁判所名または「法改正」",
    "date": "日付",
    "summary": "内容の概要（2〜3文）",
    "holding": "判断内容・改正内容（2〜3文）",
    "significance": "重要性・実務への影響",
    "citation": "関連条文"
  }
]

必ずJSON配列のみを返してください。`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return Response.json({ error: "判例の取得に失敗しました" }, { status: 500 });
  }

  return Response.json(JSON.parse(jsonMatch[0]));
}
