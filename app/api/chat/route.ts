import Anthropic from "@anthropic-ai/sdk";
import { getLawById } from "@/lib/laws";

const client = new Anthropic();

export async function POST(req: Request) {
  const { messages, lawId, imageBase64 } = await req.json();

  const law = getLawById(lawId);
  const lawName = law?.name ?? "法律全般";

  const systemPrompt = `あなたは${lawName}の専門家です。
ユーザーの質問に対して、正確でわかりやすい解説を日本語で行ってください。
- 条文番号を引用して説明してください
- 重要な判例があれば言及してください
- 難しい法律用語は噛み砕いて説明してください
- 最新の法改正情報も考慮してください`;

  const formattedMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  if (imageBase64) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      lastMsg.content = [
        {
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
        },
        { type: "text", text: lastMsg.content || "この問題を解説してください。" },
      ];
    }
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: formattedMessages,
    stream: true,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
