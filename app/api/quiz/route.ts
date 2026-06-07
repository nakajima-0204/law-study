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
    easy: `基礎レベル。条文の文言・基本的な要件・効果を問う。
例：「民法第709条の不法行為の要件として正しいものはどれか」`,
    medium: `中級レベル。判例・事例への条文適用・要件の解釈を問う。
例：「AがBに対して〜した場合、法的に認められる主張はどれか」`,
    hard: `上級レベル。司法試験・予備試験レベル。複数の法律の絡み合い・学説対立・最新判例を問う。
例：「判例の立場から見て〜の処理として最も適切なものはどれか」`,
  };

  const prompt = `あなたは${lawName}の専門家です。
以下の条件で質の高い一問一答問題を1問作成してください。

【難易度】
${difficultyMap[difficulty]}

【出題のルール】
- 必ず正確な条文番号（第○条第○項）を根拠とすること
- 最新の法改正・重要判例を反映すること
- 誤りの選択肢は「それっぽいが間違い」なものにして、単純な誤りにしないこと
- 問題文は具体的な事例形式か、条文の正確な理解を問う形式にすること
- 解説は「なぜ正解なのか」「なぜ他の選択肢が誤りなのか」を条文・判例を引用して詳しく説明すること

以下のJSON形式のみで返答してください（前後の説明不要、JSONのみ）：
{
  "question": "問題文（具体的で明確に）",
  "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
  "correct": 0,
  "explanation": "詳細な解説。正解の理由を条文・判例を引用して説明し、各誤り選択肢がなぜ誤りなのかも説明する。",
  "article": "主な関連条文（例：民法第709条、民法第710条）"
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: "問題の生成に失敗しました" }, { status: 500 });
  }

  return Response.json(JSON.parse(jsonMatch[0]));
}
