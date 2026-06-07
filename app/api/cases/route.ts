import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/model";
import { getLawById } from "@/lib/laws";
import { checkLimit } from "@/lib/limits";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lawId = searchParams.get("lawId");
  if (!lawId) return Response.json([]);
  const staticPath = join(process.cwd(), "data", "cases", `${lawId}.json`);
  if (!existsSync(staticPath)) return Response.json([]);
  return Response.json(JSON.parse(readFileSync(staticPath, "utf-8")));
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const OFFICIAL_SOURCES = `
━━ 必須参照先（この順序で優先） ━━
1. 最高裁判所判例集: https://www.courts.go.jp/app/hanrei_jp/search1
2. 最高裁判所裁判例情報: https://www.courts.go.jp/app/hanrei_jp/detail2
3. e-Gov法令データベース: https://laws.e-gov.go.jp
4. 法務省: https://www.moj.go.jp
5. 各省庁の公式サイト・立法担当者の解説

━━ 判例引用の厳格なルール ━━
- 最高裁大法廷: 「最大判○年○月○日、民集○巻○号○頁」
- 最高裁小法廷: 「最判○年○月○日、民集○巻○号○頁」
- 最高裁決定: 「最決○年○月○日、刑集○巻○号○頁」
- 高裁: 「○高判○年○月○日」
- 地裁: 「○地判○年○月○日」
- 引用情報が不確かな場合は「詳細は最高裁判所判例集で確認してください」と付記する
`;

export async function POST(req: Request) {
  const check = await checkLimit("cases");
  if (!check.allowed) {
    return Response.json({ error: check.reason }, { status: 401 });
  }

  const { lawId, query, type } = await req.json();

  const law = getLawById(lawId);
  const lawName = law?.name ?? "法律全般";

  let prompt = "";

  const caseSchema = `[
  {
    "title": "判例の通称・事件名",
    "court": "裁判所名（例：最高裁判所大法廷）",
    "date": "判決日（例：2023年3月15日）",
    "citation": "正確な引用情報（例：民集77巻3号1頁）",
    "article": "関連条文（例：民法709条・710条）",
    "summary": "事案の概要：当事者・事実関係・争点を明確に（3〜5文）",
    "holding": "判旨：裁判所の法的判断と理由を正確に（3〜5文）",
    "significance": "判例の意義：法解釈・実務・その後への影響（2〜3文）",
    "source": "参照した公式URL"
  }
]`;

  if (type === "landmark") {
    prompt = `${lawName}を深く学ぶ上で絶対に押さえるべき重要判例・リーディングケースを5件、最高裁判所判例集（https://www.courts.go.jp/app/hanrei_jp/search1）を必ず参照して教えてください。

${OFFICIAL_SOURCES}

選定基準：
- その分野の法解釈を確立・変更した判例
- 法学部の教科書・試験で必出の判例
- 実務・立法に大きな影響を与えた判例
- 最新の重要判例も含める

各判例について以下のJSON配列形式のみで返してください：
${caseSchema}

JSONのみを返してください。前後に説明を入れないこと。`;

  } else if (type === "search") {
    prompt = `${lawName}に関して「${query}」というキーワードで関連する判例・事例を最高裁判所判例集（https://www.courts.go.jp/app/hanrei_jp/search1）から3〜5件検索してください。

${OFFICIAL_SOURCES}

学習者が「${query}」を理解する上で特に重要な判例を優先してください。

以下のJSON配列形式のみで返してください：
${caseSchema}

JSONのみを返してください。前後に説明を入れないこと。`;

  } else if (type === "recent") {
    prompt = `${lawName}に関する直近2〜3年以内の新しい判例・法改正・重要な法的動向を最高裁判所（https://www.courts.go.jp）・e-Gov（https://laws.e-gov.go.jp）・法務省の公式情報から5件教えてください。

${OFFICIAL_SOURCES}

実務・学習に影響する重要なものを優先してください。

以下のJSON配列形式のみで返してください：
${caseSchema}

JSONのみを返してください。前後に説明を入れないこと。`;
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 512 },
    },
  });

  const text = response.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return Response.json({ error: "判例の取得に失敗しました" }, { status: 500 });
  }

  return Response.json(JSON.parse(jsonMatch[0]));
}
