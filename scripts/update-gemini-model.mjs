/**
 * 毎月1日に実行され、最新の Gemini Flash モデルに自動更新する。
 * GitHub Actions から呼び出される。
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_FILE = join(__dirname, "..", "lib", "model.ts");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchLatestFlashModel() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();

  const models: { name: string; displayName: string; supportedGenerationMethods: string[] }[] =
    data.models ?? [];

  // generateContent に対応している Flash モデルだけ絞り込む
  const flashModels = models
    .filter(
      (m) =>
        m.name.includes("flash") &&
        m.supportedGenerationMethods?.includes("generateContent")
    )
    .map((m) => m.name.replace("models/", ""));

  console.log("利用可能な Flash モデル:", flashModels);

  // gemini-2.x-flash 系で最新のものを選ぶ（preview > stable の順に優先）
  const preview = flashModels
    .filter((m) => m.includes("preview"))
    .sort()
    .reverse()[0];

  const stable = flashModels
    .filter((m) => !m.includes("preview") && m.startsWith("gemini-2"))
    .sort()
    .reverse()[0];

  return preview ?? stable ?? null;
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY が設定されていません");
    process.exit(1);
  }

  const current = readFileSync(MODEL_FILE, "utf-8");
  const currentMatch = current.match(/GEMINI_MODEL = "([^"]+)"/);
  const currentModel = currentMatch?.[1] ?? "";
  console.log("現在のモデル:", currentModel);

  const latest = await fetchLatestFlashModel();
  if (!latest) {
    console.log("最新モデルの取得に失敗しました");
    process.exit(0);
  }

  console.log("最新モデル:", latest);

  if (latest === currentModel) {
    console.log("既に最新です。更新不要。");
    process.exit(0);
  }

  const updated = current.replace(
    /GEMINI_MODEL = "[^"]+"/,
    `GEMINI_MODEL = "${latest}"`
  );
  writeFileSync(MODEL_FILE, updated, "utf-8");
  console.log(`✅ モデルを更新しました: ${currentModel} → ${latest}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
