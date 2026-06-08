// 1件だけテスト実行
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

if (!GEMINI_API_KEY) { console.error("GEMINI_API_KEY が未設定"); process.exit(1); }

const prompt = `民法（債権総論）の重要判例・最高裁判例を2件、以下のJSON配列のみで返してください（説明不要）：
[{"title":"事件名","court":"裁判所","date":"判決日","citation":"引用","article":"条文","summary":"概要","holding":"判旨","significance":"重要性","source":"URL"}]`;

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: 0.1 },
    }),
  }
);

const data = await res.json();
console.log("Status:", res.status);
const parts = data.candidates?.[0]?.content?.parts ?? [];
const text = parts.filter((p) => typeof p.text === "string").map((p) => p.text).join("");
console.log("Text length:", text.length);
console.log("First 500 chars:", text.slice(0, 500));
const match = text.match(/\[[\s\S]*?\]/);
if (match) {
  console.log("\n✅ JSON取得成功:");
  console.log(JSON.parse(match[0]).length, "件");
} else {
  console.log("\n❌ JSON取得失敗");
  console.log("Full response:", JSON.stringify(data).slice(0, 1000));
}
