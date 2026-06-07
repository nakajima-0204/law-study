import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { category, message, lawRequest } = await req.json();

  if (!message?.trim()) {
    return Response.json({ error: "メッセージを入力してください" }, { status: 400 });
  }

  const categoryLabels: Record<string, string> = {
    feature: "機能追加リクエスト",
    law: "法律追加リクエスト",
    bug: "バグ報告",
    other: "その他",
  };

  const subject = `[Themisia フィードバック] ${categoryLabels[category] ?? category}`;
  const body = `
カテゴリ: ${categoryLabels[category] ?? category}
${lawRequest ? `希望する法律・分野: ${lawRequest}\n` : ""}
メッセージ:
${message}

---
送信元: Themisia（テミシア）
  `.trim();

  try {
    await resend.emails.send({
      from: "Themisia <onboarding@resend.dev>",
      to: "nakajima@micoto.io",
      subject,
      text: body,
    });
    return Response.json({ success: true });
  } catch (e) {
    console.error("Email send error:", e);
    return Response.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
