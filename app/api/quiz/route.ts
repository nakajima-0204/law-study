import { GoogleGenAI } from "@google/genai";
import { getLawById } from "@/lib/laws";
import { checkLimit } from "@/lib/limits";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  const check = await checkLimit("quiz");
  if (!check.allowed) {
    return Response.json({ error: check.reason }, { status: 401 });
  }

  const { lawId, difficulty = "medium" } = await req.json();

  const law = getLawById(lawId);
  const lawName = law?.name ?? "法律全般";

  const difficultyMap: Record<string, string> = {
    easy: "基礎レベル（条文の基本的な内容）",
    medium: "中級レベル（応用・事例問題）",
    hard: "上級レベル（司法試験・予備試験レベル）",
  };

  const prompt = `${lawName}に関する${difficultyMap[difficulty]}の一問一答問題を1問作成してください。
最新の判例や法改正も考慮した出題にしてください。

以下のJSON形式のみで返答してください（説明不要）：
{
  "question": "問題文",
  "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
  "correct": 0,
  "explanation": "解説（条文・判例を引用した詳しい解説）",
  "article": "関連条文（例：民法第709条）"
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: "問題の生成に失敗しました" }, { status: 500 });
  }

  return Response.json(JSON.parse(jsonMatch[0]));
}
