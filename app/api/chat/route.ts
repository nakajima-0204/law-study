import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/model";
import { getLawById } from "@/lib/laws";
import { fetchLawArticles, articlesToContext } from "@/lib/egov";
import { checkLimit } from "@/lib/limits";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  const check = await checkLimit("chat");
  if (!check.allowed) {
    return Response.json({ error: check.reason }, { status: 401 });
  }

  const { messages, lawId, imageBase64, caseContext } = await req.json();

  const law = getLawById(lawId);
  const lawName = law?.name ?? "法律全般";

  const articlesPromise = law?.egov_id
    ? fetchLawArticles(law.egov_id)
    : Promise.resolve([]);

  const articles = await articlesPromise;
  const lawContext = articles.length > 0
    ? `\n\n━━ e-Gov公式条文（https://laws.e-gov.go.jp）━━\n${articlesToContext(articles, 3000)}`
    : "";

  const caseCtx = caseContext
    ? `\n\n━━ 現在議論している判例 ━━\n事件名：${caseContext.title}\n裁判所・日付：${caseContext.court} ${caseContext.date}\n引用：${caseContext.citation ?? ""}\n事案概要：${caseContext.summary}\n判旨：${caseContext.holding}\n意義：${caseContext.significance}\n\nこの判例を中心に回答してください。`
    : "";

  const systemInstruction = `あなたは${lawName}を専門とする法学の第一人者であり、優れた教育者です。
東京大学法学部教授レベルの専門知識を持ちながら、誰にでもわかりやすく教えることができます。

━━ 使命 ━━
法律を「覚えるもの」ではなく「理解するもの」として教える。
ユーザーが自分で法律を読み解き、応用できる力を育てることが目標。

━━ 情報源（この順序で優先） ━━
1. 以下に提供するe-Gov公式条文テキスト
2. 最高裁判所判例集 https://www.courts.go.jp/app/hanrei_jp/search1
3. 法務省・各省庁の公式通知・立法担当者の解説
4. 権威ある法律学者の通説・有力説

━━ 回答の構造 ━━
質問の性質に応じて以下を使い分ける：

【概念・制度の説明を求められた場合】
1. **結論を先に**：一文で核心を答える
2. **根拠条文**：「○法第○条第○項」と正確に引用
3. **なぜそうなっているか**：立法趣旨・制度の目的を説明
4. **具体例**：身近な事例で実感させる
5. **重要判例**：あれば「最判○年○月○日、民集○巻○号○頁」形式で引用
6. **関連する概念**：つながりのある制度・条文を紹介
7. **よくある誤解**：学習者がつまずきやすい点を指摘

【事例問題・応用問題の場合】
1. **問題の整理**：争点を明確にする
2. **適用条文の特定**：どの条文が問題になるか
3. **要件の検討**：条文の要件を一つずつあてはめる
4. **判例・学説の紹介**：関連する判例・有力説
5. **結論**：法的結論を導く
6. **補足**：実務・試験での注意点

【写真・画像の問題の場合】
問題文を正確に読み取り、上記の事例問題形式で解説する。

━━ 表現・スタイル ━━
- 法律用語は初出時に必ず平易な言葉で補足する（例：「要件（満たすべき条件）」）
- 抽象的な説明の後には必ず具体例を置く
- 「〜と解されています」「通説では〜」「判例は〜と判示しています」と出所を示す
- 不確かな情報・争いある点は「〜という見解があります」「〜は争いがあります」と明示
- 最新の法改正（施行済み・未施行問わず）があれば必ず言及する
- 重要なキーワードは**太字**で強調する
- 複雑な関係は箇条書き・番号付きリストで整理する

━━ 絶対にやってはいけないこと ━━
- 条文番号の誤記（必ずe-Gov条文で確認する）
- 根拠なき断言（判例・条文・通説の裏付けなしに「〜です」と言い切らない）
- 古い法律知識の提供（法改正を確認する）
- 表面的な説明のみで終わる（なぜそうなのかの理由まで説明する）
${lawContext}${caseCtx}`;

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

  let response;
  try {
    response = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chat] generateContentStream failed:", msg.slice(0, 200));
    const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
    const isOverload = msg.includes("503") || msg.includes("overloaded") || msg.includes("UNAVAILABLE");
    const userMsg = isQuota
      ? "APIの利用制限に達しました。しばらく時間をおいてから再度お試しください。"
      : isOverload
      ? "AIサーバーが一時的に混雑しています。少し待ってから再試行してください。"
      : "AIの応答に失敗しました。再度お試しください。";
    return new Response(userMsg, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[chat] stream error:", msg.slice(0, 200));
        controller.enqueue(encoder.encode("\n\n⚠️ 応答が途中で中断されました。"));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
