import Anthropic from "@anthropic-ai/sdk";
import { getLawById } from "@/lib/laws";

const client = new Anthropic();

export async function POST(req: Request) {
  const { lawId, difficulty = "medium" } = await req.json();

  const law = getLawById(lawId);
  const lawName = law?.name ?? "法律全般";

  const difficultyMap: Record<string, string> = {
    easy: "基礎レベル（条文の基本的な内容）",
    medium: "中級レベル（応用・事例問題）",
    hard: "上級レベル（司法試験・予備試験レベル）",
  };

  const prompt = `${lawName}に関する${difficultyMap[difficulty]}の一問一答問題を1問作成してください。

以下のJSON形式で返答してください：
{
  "question": "問題文",
  "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
  "correct": 0,
  "explanation": "解説（条文・判例を引用した詳しい解説）",
  "article": "関連条文（例：民法第709条）"
}

correctは正解の選択肢のインデックス（0〜3）です。必ずJSONのみを返してください。`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: "問題の生成に失敗しました" }, { status: 500 });
  }

  return Response.json(JSON.parse(jsonMatch[0]));
}
