/**
 * e-Gov 法令APIから新しい法律を取得し、Geminiで分類してauto-laws.jsonに追加する。
 * GitHub Actionsから週1回実行される。
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const AUTO_LAWS_PATH = join(ROOT, "data", "auto-laws.json");
const LAWS_TS_PATH = join(ROOT, "lib", "laws.ts");

const EGOV_BASE = "https://laws.e-gov.go.jp/api/1";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_NEW_LAWS_PER_RUN = 20;

const DOMAIN_CATEGORIES = `
公法 (id: "public"):
  - constitutional: 憲法・憲法改正
  - administrative: 行政法・行政手続・情報公開・入管・国籍・警察・消防・道路交通
  - election: 選挙・政治資金
  - criminal: 刑法・特別刑法
  - juvenile: 少年法・児童福祉・子ども関連
  - tax: 税法・租税

私法 (id: "private"):
  - civil: 民法・不動産登記・借地借家・破産・信託
  - commercial: 商法・会社法・金融・保険・消費者法
  - intellectual: 特許・意匠・商標・著作権・種苗

訴訟法 (id: "procedural"):
  - civil-procedure: 民事訴訟・執行・保全・調停・仲裁
  - criminal-procedure: 刑事訴訟・犯罪被害者
  - court: 裁判所・弁護士・司法書士・行政書士

社会法 (id: "social"):
  - labor: 労働基準・労働契約・労働組合・派遣・最低賃金
  - gender: 男女共同参画・女性活躍・DV・LGBT・ジェンダー
  - disability-elderly: 障害者・高齢者・介護
  - social-security: 社会保険・年金・生活保護・児童手当
  - environmental: 環境基本・大気・水質・廃棄物・都市計画・建築

国際法 (id: "international"):
  - public-international: 国際公法・条約法・国連
  - human-rights-international: 国際人権法
  - humanitarian: 国際人道法・戦争法
  - international-criminal: 国際刑事法・ICC
  - international-environmental: 国際環境法・気候変動・生物多様性
  - private-international: 国際私法・国際民事訴訟
  - trade-international: 国際経済法・WTO・FTA

デジタル法 (id: "digital"):
  - digital-general: 情報・通信・プロバイダ・電子署名
  - fintech: 暗号資産・電子マネー・決済
  - ai-data: AI・データ・自動運転・ドローン

人権法 (id: "human-rights"):
  - discrimination: 差別禁止・ヘイトスピーチ
  - relief: 権利救済・被害者支援
  - privacy: プライバシー・表現の自由
`;

async function fetchEGovLawList() {
  console.log("e-Gov から法律一覧を取得中...");
  const res = await fetch(`${EGOV_BASE}/lawlists/2`); // 法律カテゴリ
  if (!res.ok) throw new Error(`e-Gov API error: ${res.status}`);
  const xml = await res.text();

  const laws = [];
  const matches = xml.matchAll(
    /<LawId>(.*?)<\/LawId>[\s\S]*?<LawName>(.*?)<\/LawName>[\s\S]*?<PromulgationDate>(.*?)<\/PromulgationDate>/g
  );
  for (const m of matches) {
    laws.push({ egov_id: m[1].trim(), name: m[2].trim(), date: m[3].trim() });
  }
  console.log(`取得: ${laws.length}件`);
  return laws;
}

function extractKnownIds() {
  const ts = readFileSync(LAWS_TS_PATH, "utf-8");
  const ids = new Set();
  for (const m of ts.matchAll(/egov_id:\s*"([^"]+)"/g)) {
    ids.add(m[1]);
  }
  return ids;
}

function loadAutoLaws() {
  try {
    return JSON.parse(readFileSync(AUTO_LAWS_PATH, "utf-8"));
  } catch {
    return [];
  }
}

async function categorizeLaw(name) {
  const prompt = `以下の日本の法律名を、最も適切なドメインとカテゴリに分類してください。

法律名: 「${name}」

ドメイン・カテゴリ一覧:
${DOMAIN_CATEGORIES}

以下のJSON形式のみで返答してください:
{"domain": "domain_id", "category": "category_id"}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const match = text.match(/\{[^}]+\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY が設定されていません");
    process.exit(1);
  }

  const [egovLaws, knownIds, autoLaws] = await Promise.all([
    fetchEGovLawList(),
    Promise.resolve(extractKnownIds()),
    Promise.resolve(loadAutoLaws()),
  ]);

  const autoIds = new Set(autoLaws.map((l) => l.egov_id));
  const allKnownIds = new Set([...knownIds, ...autoIds]);

  // 未知の法律を絞り込む（新しい日付順）
  const newLaws = egovLaws
    .filter((l) => !allKnownIds.has(l.egov_id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_NEW_LAWS_PER_RUN);

  if (newLaws.length === 0) {
    console.log("新しい法律はありませんでした");
    return;
  }

  console.log(`新しい法律 ${newLaws.length}件 を分類中...`);
  let added = 0;

  for (const law of newLaws) {
    console.log(`  分類中: ${law.name}`);
    const category = await categorizeLaw(law.name);
    if (!category) {
      console.log(`  → 分類失敗、スキップ`);
      continue;
    }

    const id = `auto-${law.egov_id}`;
    autoLaws.push({
      id,
      name: law.name,
      egov_id: law.egov_id,
      domain: category.domain,
      category: category.category,
      addedAt: new Date().toISOString().split("T")[0],
    });
    console.log(`  → ${category.domain} / ${category.category} に追加`);
    added++;

    // レート制限対策
    await new Promise((r) => setTimeout(r, 500));
  }

  if (added > 0) {
    writeFileSync(AUTO_LAWS_PATH, JSON.stringify(autoLaws, null, 2) + "\n");
    console.log(`✅ ${added}件を auto-laws.json に追加しました`);
  } else {
    console.log("追加なし");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
