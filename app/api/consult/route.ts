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

  const systemInstruction = `あなたは法律相談の入口を担うAIアシスタント「テミシア」です。

ユーザーが抱える問題・疑問・学びたいことを聞いて、
どの法律分野を学べばいいかを親切にガイドしてください。

【返答の形式】
1. まず共感・状況の整理（1〜2文）
2. 関連する法律の説明（わかりやすく）
3. 最後に必ず以下の形式で関連法律IDを出力：
   [SUGGEST: id1, id2, id3]

【利用可能な法律ID一覧】
${LAW_LIST}

【例】
ユーザー「バイトで残業代が払われませんでした」
→ 回答文...
[SUGGEST: rodo-kijun, rodo-keiyaku, baito-trouble]

【注意】
- 専門用語は使わず、親しみやすい言葉で話す
- 3〜5件の法律を提案する
- 必ず [SUGGEST: ...] を返答の最後に付ける`;

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
