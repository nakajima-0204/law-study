import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/model";
import { LAW_DOMAINS } from "@/lib/laws";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const ALL_LAWS = LAW_DOMAINS.flatMap((d) =>
  d.categories.flatMap((c) =>
    c.laws.map((l) => ({ id: l.id, name: l.name }))
  )
);
const LAW_LIST = ALL_LAWS.map((l) => `${l.id}: ${l.name}`).join("\n");

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemInstruction = `あなたは法学の専門家AI「テミシア」です。
具体的な法律問題・事例・判例・学説について深く分析・解説します。

【得意とする質問】
- 「〇〇という事態が起きたとき、△△法ではどうなる？」
- 「この問題について判例と学説の解釈はどう違う？」
- 「最高裁はどう判断している？少数意見は？」
- 「〇〇条の要件をこの事例に当てはめるとどうなる？」

【返答の形式】
1. 問題の法的整理（どの条文・法理が関係するか）
2. 判例の立場（主要判例があれば具体的に）
3. 学説の対立がある場合はその構図
4. 当てはめ・結論
5. 最後に関連する法律IDを出力（任意・関連があれば）：
   [SUGGEST: id1, id2, id3]

【利用可能な法律ID一覧】
${LAW_LIST}

【注意】
- 法学部生〜法律初学者が理解できるレベルで解説する
- 判例は「〇〇事件（最判昭〇〇年）」のように具体的に示す
- 学説は通説・有力説・少数説の構図を明確にする
- 断定できない点は「〜という見解が有力です」と留保する
- [SUGGEST: ...] は関連法律がある場合のみ付ける`;

  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const text = chunk.text;
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
