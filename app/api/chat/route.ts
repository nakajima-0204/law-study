import { GoogleGenAI } from "@google/genai";
import { getLawById } from "@/lib/laws";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  const { messages, lawId, imageBase64 } = await req.json();

  const law = getLawById(lawId);
  const lawName = law?.name ?? "法律全般";

  const systemInstruction = `あなたは${lawName}の専門家です。
ユーザーの質問に対して、正確でわかりやすい解説を日本語で行ってください。
- 条文番号を引用して説明してください
- 重要な判例があれば最新のものを優先して言及してください
- 難しい法律用語は噛み砕いて説明してください
- Google検索で得た最新の法改正・判例情報を積極的に活用してください`;

  const contents = messages.map((m: { role: string; content: string }, i: number) => {
    const isLast = i === messages.length - 1;
    const isUser = m.role === "user";

    if (isLast && isUser && imageBase64) {
      return {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          { text: m.content || "この問題を解いて解説してください。" },
        ],
      };
    }

    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    };
  });

  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-flash-preview-05-20",
    contents,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
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
