import { NextResponse } from "next/server";

const MODEL = "gemini-2.0-flash";
const ADMIN_TOKEN = "themisia-admin-2026";

const CASE_SCHEMA = `[{"title":"判例の通称・事件名","court":"裁判所名","date":"判決日","citation":"引用情報","article":"関連条文","summary":"事案概要（2〜3文）","holding":"判旨・要旨（2〜3文）","significance":"重要性（1〜2文）","source":"参照URL"}]`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("token") !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const lawName = searchParams.get("law");
  if (!lawName) {
    return NextResponse.json({ error: "law parameter required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  const prompt = `${lawName}の重要判例・最高裁判例を3〜5件、以下のJSON配列のみで返してください（説明不要）：
${CASE_SCHEMA}
選定基準：法学教科書必出・実務影響大・法解釈確立の判例。`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Gemini ${res.status}`, detail: err.slice(0, 200) }, { status: res.status });
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p: { text?: string }) => typeof p.text === "string").map((p: { text: string }) => p.text).join("");

  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) {
    return NextResponse.json({ error: "JSON not found", raw: text.slice(0, 300) }, { status: 500 });
  }

  return NextResponse.json(JSON.parse(match[0]));
}
