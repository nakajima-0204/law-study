import { GoogleGenAI } from "@google/genai";
import { getLawById } from "@/lib/laws";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const OFFICIAL_SOURCES = `
【必ず参照すべき公式情報源】
- 最高裁判所判例集: https://www.courts.go.jp/app/hanrei_jp/search1
- 最高裁判所裁判例情報: https://www.courts.go.jp/app/hanrei_jp/detail2
- e-Gov法令データベース: https://laws.e-gov.go.jp
- 法務省: https://www.moj.go.jp
- 各省庁の公式サイト

上記の公式情報源から取得した情報を優先してください。
判例の引用形式: 「最判（最大判）○年○月○日、民集○巻○号○頁」または「最決○年○月○日」
`;

export async function POST(req: Request) {
  const { lawId, query, type } = await req.json();

  const law = getLawById(lawId);
  const lawName = law?.name ?? "法律全般";

  let prompt = "";

  if (type === "landmark") {
    prompt = `${lawName}に関する重要判例・リーディングケースを5件、最高裁判所判例集（https://www.courts.go.jp/app/hanrei_jp/search1）などの公式ソースを検索して教えてください。

${OFFICIAL_SOURCES}

各判例について以下のJSON配列形式で返してください：
[
  {
    "title": "判例の通称・事件名",
    "court": "裁判所名（例：最高裁判所大法廷）",
    "date": "判決日（例：2023年3月15日）",
    "citation": "引用情報（例：民集77巻3号1頁）",
    "article": "関連条文（例：民法709条）",
    "summary": "事案の概要（3〜4文）",
    "holding": "判決の要旨・法的判断（3〜4文）",
    "significance": "この判例の重要性・実務への影響（2〜3文）",
    "source": "参照した公式URL"
  }
]

必ずJSON配列のみを返してください。`;
  } else if (type === "search") {
    prompt = `${lawName}に関して「${query}」というキーワードで、最高裁判所判例集（https://www.courts.go.jp/app/hanrei_jp/search1）を中心に公式ソースから関連する判例・事例を3〜5件検索してください。

${OFFICIAL_SOURCES}

以下のJSON配列形式で返してください：
[
  {
    "title": "判例の通称・事件名",
    "court": "裁判所名",
    "date": "判決日",
    "citation": "引用情報",
    "article": "関連条文",
    "summary": "事案の概要（3〜4文）",
    "holding": "判決の要旨・法的判断（3〜4文）",
    "significance": "この判例の重要性（2〜3文）",
    "source": "参照した公式URL"
  }
]

必ずJSON配列のみを返してください。`;
  } else if (type === "recent") {
    prompt = `${lawName}に関する直近2〜3年以内の新しい判例・法改正を、最高裁判所（https://www.courts.go.jp）・e-Gov（https://laws.e-gov.go.jp）・法務省・各省庁の公式情報から検索して5件教えてください。

${OFFICIAL_SOURCES}

以下のJSON配列形式で返してください：
[
  {
    "title": "判例・法改正の名称",
    "court": "裁判所名または「法改正」「省令改正」",
    "date": "日付",
    "citation": "引用情報または法令番号",
    "article": "関連条文",
    "summary": "内容の概要（3〜4文）",
    "holding": "判断内容・改正内容（3〜4文）",
    "significance": "重要性・実務への影響（2〜3文）",
    "source": "参照した公式URL"
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
