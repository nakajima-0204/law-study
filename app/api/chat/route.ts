import { GoogleGenAI } from "@google/genai";
import { getLawById } from "@/lib/laws";
import { fetchLawArticles, articlesToContext } from "@/lib/egov";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  const { messages, lawId, imageBase64 } = await req.json();

  const law = getLawById(lawId);
  const lawName = law?.name ?? "法律全般";

  // e-Gov から条文テキストを取得してコンテキストに注入
  let lawContext = "";
  if (law?.egov_id) {
    const articles = await fetchLawArticles(law.egov_id);
    if (articles.length > 0) {
      lawContext = `\n\n【e-Gov公式条文（https://laws.e-gov.go.jp）より取得】\n${articlesToContext(articles)}`;
    }
  }

  const systemInstruction = `あなたは${lawName}の専門家です。以下の原則で回答してください。

【情報源の優先順位】
1. e-Gov法令データベース（https://laws.e-gov.go.jp）の公式条文テキスト（以下に提供）
2. 最高裁判所判例集（https://www.courts.go.jp/app/hanrei_jp/search1）の判例
3. 法務省・各省庁の公式通知・解釈
4. Google検索で取得した最新情報（法改正・新判例）

【回答ルール】
- 条文を引用する際は「第○条第○項」と正確に番号を明記する
- 判例を引用する際は「最判（最大判）〇年〇月〇日、民集〇巻〇号〇頁」の形式で表記する
- 推測・不確かな情報は「〜と解されています」「〜の見解があります」と明示する
- 最新の法改正があれば必ず言及する
- 難しい法律用語は括弧内に平易な説明を加える
${lawContext}`;

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
