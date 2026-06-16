import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/model";
import { getLawById, getDomainByLawId } from "@/lib/laws";
import { checkLimit } from "@/lib/limits";
import { sql } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lawId = searchParams.get("lawId");
  const lawName = searchParams.get("lawName");
  if (!lawId) return Response.json([]);

  try {
    const rows = await sql`
      SELECT id, title, court, date, summary, holding, significance, citation, article, source,
             summary_ja, holding_ja, significance_ja
      FROM cases
      WHERE law_id = ${lawId}
      ORDER BY id
    `;
    if (rows.length > 0) return Response.json(rows);
  } catch {
    // DBが未接続の場合はフォールバック
  }

  // DBに無ければオンデマンド生成
  if (!lawName || !process.env.GEMINI_API_KEY) return Response.json([]);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `${lawName}を学ぶ上で絶対に押さえるべき重要判例・リーディングケースを5件教えてください。
以下のJSON配列形式のみで返してください（説明不要）：
[{"title":"事件名","court":"裁判所名","date":"判決日","citation":"引用情報","article":"関連条文","summary":"事案概要（2〜3文）","holding":"判旨（2〜3文）","significance":"重要性（1〜2文）","source":"参照URL"}]
JSONのみ返すこと。`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });

    const text = response.text ?? "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return Response.json([]);
    return Response.json(JSON.parse(jsonMatch[0]));
  } catch {
    return Response.json([]);
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const OFFICIAL_SOURCES = `
━━ 必須参照先（この順序で優先） ━━
1. 最高裁判所判例集: https://www.courts.go.jp/app/hanrei_jp/search1
2. 最高裁判所裁判例情報: https://www.courts.go.jp/app/hanrei_jp/detail2
3. e-Gov法令データベース: https://laws.e-gov.go.jp
4. 法務省: https://www.moj.go.jp
5. 各省庁の公式サイト・立法担当者の解説

━━ 判例引用の厳格なルール ━━
- 最高裁大法廷: 「最大判○年○月○日、民集○巻○号○頁」
- 最高裁小法廷: 「最判○年○月○日、民集○巻○号○頁」
- 最高裁決定: 「最決○年○月○日、刑集○巻○号○頁」
- 高裁: 「○高判○年○月○日」
- 地裁: 「○地判○年○月○日」
- 引用情報が不確かな場合は「詳細は最高裁判所判例集で確認してください」と付記する
`;

const INTL_SOURCES = `
━━ 必須参照先（優先順） ━━
1. 国際司法裁判所（ICJ）: https://www.icj-cij.org/cases
2. 欧州人権裁判所 HUDOC: https://hudoc.echr.coe.int
3. 国際刑事裁判所（ICC）: https://www.icc-cpi.int/cases
4. 国際海洋法裁判所（ITLOS）: https://www.itlos.org/cases/
5. WTO紛争解決: https://www.wto.org/english/tratop_e/dispu_e/dispu_e.htm
6. ICSID（投資仲裁）: https://icsid.worldbank.org/cases/case-database
7. 米国最高裁判所: https://www.supremecourt.gov/opinions/opinions.aspx
8. 欧州司法裁判所（CJEU）: https://curia.europa.eu

━━ 判例引用の厳格なルール ━━
- ICJ: 「ICJ, [事件名], [年] ICJ Reports [頁]」
- ECHR: 「ECtHR, [事件名] v. [国名], App. No. [番号], [日付]」
- ICC: 「ICC, [事件名], Case No. [番号], [日付]」
- ITLOS: 「ITLOS, Case No. [番号], [日付]」
- WTO: 「WTO Panel/AB, [DS番号], [事件名], [日付]」
- 引用が不確かな場合は必ず「詳細は[裁判所名]公式サイトで確認してください」と付記する
`;

export async function POST(req: Request) {
  const check = await checkLimit("cases");
  if (!check.allowed) {
    return Response.json({ error: check.reason }, { status: 401 });
  }

  const { lawId, query, type, caseData } = await req.json();

  const law = getLawById(lawId);
  const lawName = law?.name ?? "法律全般";
  const domain = getDomainByLawId(lawId);
  const isIntl = domain?.id === "international" || domain?.id === "human-rights" ||
    ["us-law","eu-law","uk-law","german-law","french-law","china-law","korea-law","islamic-law",
     "climate-sosho-intl","sensou-kokusaiho","cyber-anpo","gender-kokusai","kokusai-jinken-kikan",
     "kokusai-jinken-kouki","ianfu-mondai"].includes(lawId);
  const sources = isIntl ? INTL_SOURCES : OFFICIAL_SOURCES;

  let prompt = "";

  const courtLabel = isIntl
    ? "国際司法裁判所（ICJ）・欧州人権裁判所（ECHR）・ICC等の国際裁判所"
    : "最高裁判所判例集（https://www.courts.go.jp/app/hanrei_jp/search1）";

  const caseSchema = isIntl ? `[
  {
    "title": "事件名（例：Nicaragua v. United States、Airey v. Ireland）",
    "court": "裁判所名（例：International Court of Justice、European Court of Human Rights）",
    "date": "判決日（例：1986-06-27）",
    "citation": "正確な引用情報（例：1986 ICJ Reports 14、App. No. 6289/73）",
    "article": "関連条文・条約（例：UN Charter Art.2(4)、ECHR Art.3）",
    "summary": "事案の概要：当事者・事実関係・争点を明確に（3〜5文）",
    "holding": "判旨：裁判所の法的判断と理由を正確に（3〜5文）",
    "significance": "判例の意義：国際法発展・後続判例・実務への影響（2〜3文）",
    "source": "参照した公式URL（icj-cij.org、hudoc.echr.coe.int等）"
  }
]` : `[
  {
    "title": "判例の通称・事件名",
    "court": "裁判所名（例：最高裁判所大法廷）",
    "date": "判決日（例：2023年3月15日）",
    "citation": "正確な引用情報（例：民集77巻3号1頁）",
    "article": "関連条文（例：民法709条・710条）",
    "summary": "事案の概要：当事者・事実関係・争点を明確に（3〜5文）",
    "holding": "判旨：裁判所の法的判断と理由を正確に（3〜5文）",
    "significance": "判例の意義：法解釈・実務・その後への影響（2〜3文）",
    "source": "参照した公式URL"
  }
]`;

  if (type === "landmark") {
    prompt = `${lawName}を深く学ぶ上で絶対に押さえるべき重要判例・リーディングケースを5件、${courtLabel}を必ず参照して教えてください。

${sources}

選定基準：
- その分野の法解釈を確立・変更した判例
- 法学部の教科書・試験で必出の判例
- 実務・立法に大きな影響を与えた判例
- 最新の重要判例も含める

各判例について以下のJSON配列形式のみで返してください：
${caseSchema}

JSONのみを返してください。前後に説明を入れないこと。`;

  } else if (type === "search") {
    prompt = `${lawName}に関して「${query}」というキーワードで関連する判例・事例を${courtLabel}から3〜5件検索してください。

${sources}

学習者が「${query}」を理解する上で特に重要な判例を優先してください。

以下のJSON配列形式のみで返してください：
${caseSchema}

JSONのみを返してください。前後に説明を入れないこと。`;

  } else if (type === "situation") {
    prompt = `${lawName}の分野で、次の状況・事実関係に最も関連する判例を3〜5件、${courtLabel}から探してください。

状況：「${query}」

この状況に当てはまる当事者・争点・法的結論が参考になる判例を優先してください。

${sources}

以下のJSON配列形式のみで返してください：
${caseSchema}

JSONのみを返してください。前後に説明を入れないこと。`;

  } else if (type === "explain") {
    const cd = caseData ?? {};

    // explain_cacheをDBから取得（キャッシュHIT）
    try {
      const cached = await sql`
        SELECT explain_cache FROM cases
        WHERE (title = ${cd.title ?? ""} OR citation = ${cd.citation ?? ""})
          AND explain_cache IS NOT NULL AND explain_cache != ''
        LIMIT 1
      `;
      if (cached.length > 0 && cached[0].explain_cache) {
        return Response.json(JSON.parse(cached[0].explain_cache));
      }
    } catch { /* キャッシュ取得失敗は無視して生成に進む */ }

    prompt = `以下の判例を3段階の難易度で解説してください。

判例：${cd.title ?? ""}
裁判所：${cd.court ?? ""}　日付：${cd.date ?? ""}
事案：${cd.summary ?? ""}
判旨：${cd.holding ?? ""}
意義：${cd.significance ?? ""}

以下のJSON形式のみで返してください（改行なしのコンパクトなJSON）：
{"easy":"中学生でもわかる言葉で解説。法律用語なし、たとえ話あり（200〜250字）","legal":"法学部生向け。争点・要件・判旨の法的意義を体系的に（300〜350字）","practical":"弁護士・企業法務向け。実務への影響・注意点・後続判例展開（300〜350字）"}

JSONのみ返すこと。前後に文章を入れないこと。`;

  } else if (type === "recent") {
    const recentSources = isIntl
      ? "ICJ（https://www.icj-cij.org）・ECHR（https://hudoc.echr.coe.int）・ICC（https://www.icc-cpi.int）・ITLOS・WTO・各国最高裁の公式情報"
      : "最高裁判所（https://www.courts.go.jp）・e-Gov（https://laws.e-gov.go.jp）・法務省の公式情報";
    prompt = `${lawName}に関する直近2〜3年以内の新しい判例・法改正・重要な法的動向を${recentSources}から5件教えてください。

${sources}

実務・学習に影響する重要なものを優先してください。

以下のJSON配列形式のみで返してください：
${caseSchema}

JSONのみを返してください。前後に説明を入れないこと。`;
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 512 },
    },
  });

  const text = response.text ?? "";
  const jsonMatch = type === "explain"
    ? text.match(/\{[\s\S]*\}/)
    : text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return Response.json({ error: "判例の取得に失敗しました" }, { status: 500 });
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // explain_cache をDBに保存（非同期・失敗しても返答は返す）
  if (type === "explain" && caseData?.title) {
    sql`
      UPDATE cases SET explain_cache = ${JSON.stringify(parsed)}
      WHERE (title = ${caseData.title} OR citation = ${caseData.citation ?? ""})
        AND (explain_cache IS NULL OR explain_cache = '')
    `.catch(() => {});
  }

  return Response.json(parsed);
}
