export type LawCategory = {
  id: string;
  name: string;
  laws: Law[];
};

export type Law = {
  id: string;
  name: string;
  shortName?: string;
  egov_id?: string;
};

export const LAW_CATEGORIES: LawCategory[] = [
  {
    id: "constitutional",
    name: "憲法・行政法",
    laws: [
      { id: "kenpo", name: "日本国憲法" },
      { id: "gyosei-tetsuzuki", name: "行政手続法" },
      { id: "gyosei-fufuku", name: "行政不服申立法" },
      { id: "gyosei-jiken", name: "行政事件訴訟法" },
      { id: "kokka-baisho", name: "国家賠償法" },
      { id: "chiho-jichi", name: "地方自治法" },
      { id: "kokka-komuin", name: "国家公務員法" },
      { id: "chiho-komuin", name: "地方公務員法" },
      { id: "joho-kokai", name: "情報公開法" },
      { id: "kojin-joho", name: "個人情報保護法" },
      { id: "gyosei-daishikko", name: "行政代執行法" },
    ],
  },
  {
    id: "civil",
    name: "民法",
    laws: [
      { id: "minpo-soron", name: "民法総則" },
      { id: "minpo-bukken", name: "民法（物権）" },
      { id: "minpo-saiken", name: "民法（債権総論）" },
      { id: "minpo-kakushu", name: "民法（各種契約）" },
      { id: "minpo-jiko", name: "民法（事務管理・不当利得・不法行為）" },
      { id: "minpo-kazoku", name: "民法（親族・相続）" },
      { id: "fudosan-toroki", name: "不動産登記法" },
      { id: "shakuchi-shakka", name: "借地借家法" },
      { id: "shintaku", name: "信託法" },
      { id: "hasan", name: "破産法" },
      { id: "minzi-saisei", name: "民事再生法" },
      { id: "kaisha-kosei", name: "会社更生法" },
    ],
  },
  {
    id: "commercial",
    name: "商法・会社法",
    laws: [
      { id: "shoho-soron", name: "商法総則・商行為" },
      { id: "kaisha-soron", name: "会社法（総則・設立）" },
      { id: "kaisha-kabushiki", name: "会社法（株式・新株予約権）" },
      { id: "kaisha-kikan", name: "会社法（機関）" },
      { id: "kaisha-kaikei", name: "会社法（計算・解散）" },
      { id: "kaisha-henshin", name: "会社法（組織再編）" },
      { id: "tegata", name: "手形法" },
      { id: "kogitte", name: "小切手法" },
      { id: "hoken", name: "保険法" },
      { id: "kaijo", name: "商法（海商）" },
      { id: "kingyu-shohin", name: "金融商品取引法" },
      { id: "dokusen-kinshi", name: "独占禁止法" },
      { id: "fusei-kyoso", name: "不正競争防止法" },
      { id: "shohi-keiyaku", name: "消費者契約法" },
      { id: "halloppa", name: "割賦販売法" },
    ],
  },
  {
    id: "criminal",
    name: "刑法・刑事訴訟法",
    laws: [
      { id: "keiho-soron", name: "刑法総論" },
      { id: "keiho-kakuron", name: "刑法各論" },
      { id: "keisosho", name: "刑事訴訟法" },
      { id: "keiji-shikko", name: "刑事収容施設法" },
      { id: "saiban-in", name: "裁判員法" },
      { id: "sosoki", name: "組織的犯罪処罰法" },
      { id: "yakubutsu", name: "薬物関連法（覚醒剤取締法等）" },
      { id: "dv-bo", name: "DV防止法" },
      { id: "strker-kisei", name: "ストーカー規制法" },
      { id: "jido-fukushi-keiho", name: "児童福祉法（刑事規定）" },
    ],
  },
  {
    id: "civil-procedure",
    name: "民事訴訟・執行・保全",
    laws: [
      { id: "minsosho", name: "民事訴訟法" },
      { id: "minsikko", name: "民事執行法" },
      { id: "minhozen", name: "民事保全法" },
      { id: "saibansho", name: "裁判所法" },
      { id: "bengoshi", name: "弁護士法" },
      { id: "chusai", name: "仲裁法" },
      { id: "minji-chosei", name: "民事調停法" },
      { id: "kazoku-jiken", name: "家事事件手続法" },
    ],
  },
  {
    id: "labor",
    name: "労働法",
    laws: [
      { id: "rodo-kijun", name: "労働基準法" },
      { id: "rodo-keiyaku", name: "労働契約法" },
      { id: "rodo-kumiai", name: "労働組合法" },
      { id: "rodo-kankei-chosei", name: "労働関係調整法" },
      { id: "koyo-kinto", name: "男女雇用機会均等法" },
      { id: "ikuji-kaigo", name: "育児・介護休業法" },
      { id: "rodo-anzen", name: "労働安全衛生法" },
      { id: "koyo-hoken", name: "雇用保険法" },
      { id: "rodo-sha-saigai", name: "労災保険法" },
      { id: "haken-rodo", name: "労働者派遣法" },
      { id: "saiyo-antei", name: "職業安定法" },
      { id: "saichin", name: "最低賃金法" },
    ],
  },
  {
    id: "intellectual",
    name: "知的財産法",
    laws: [
      { id: "tokkyo", name: "特許法" },
      { id: "jitsuyoann", name: "実用新案法" },
      { id: "isho", name: "意匠法" },
      { id: "shouhyo", name: "商標法" },
      { id: "chosakuken", name: "著作権法" },
      { id: "fusei-kyoso-chizai", name: "不正競争防止法（知財）" },
      { id: "shubyo", name: "種苗法" },
    ],
  },
  {
    id: "tax",
    name: "税法",
    laws: [
      { id: "shotoku-zei", name: "所得税法" },
      { id: "hojin-zei", name: "法人税法" },
      { id: "shohizei", name: "消費税法" },
      { id: "sozoku-zei", name: "相続税法" },
      { id: "fudosan-shotoku", name: "租税特別措置法（不動産）" },
      { id: "kokuzei-tsusoku", name: "国税通則法" },
      { id: "kokuzei-choshu", name: "国税徴収法" },
      { id: "chiho-zei", name: "地方税法" },
    ],
  },
  {
    id: "social",
    name: "社会保障法",
    laws: [
      { id: "kenko-hoken", name: "健康保険法" },
      { id: "kosei-nenkin", name: "厚生年金保険法" },
      { id: "kokumin-nenkin", name: "国民年金法" },
      { id: "kaigo-hoken", name: "介護保険法" },
      { id: "seikatsuhogo", name: "生活保護法" },
      { id: "shougaisha", name: "障害者総合支援法" },
      { id: "jidou-teate", name: "児童手当法" },
    ],
  },
  {
    id: "environmental",
    name: "環境法・その他",
    laws: [
      { id: "kankyo-kihon", name: "環境基本法" },
      { id: "taiki-osen", name: "大気汚染防止法" },
      { id: "suishitsu-odaku", name: "水質汚濁防止法" },
      { id: "junkan-shakai", name: "循環型社会形成推進基本法" },
      { id: "toshi-keikaku", name: "都市計画法" },
      { id: "kenchiku-kijun", name: "建築基準法" },
      { id: "nochi", name: "農地法" },
      { id: "kokkyo-tatemono", name: "区分所有法" },
    ],
  },
  {
    id: "digital",
    name: "デジタル・新領域",
    laws: [
      { id: "fusei-access", name: "不正アクセス禁止法" },
      { id: "denshi-shomu", name: "電子署名法" },
      { id: "it-kihon", name: "IT基本法（デジタル社会形成基本法）" },
      { id: "ai-kisoku", name: "AI・データ関連法規（最新動向）" },
      { id: "crypto-asset", name: "資金決済法（暗号資産）" },
      { id: "drone-kisoku", name: "航空法（ドローン規制）" },
    ],
  },
  {
    id: "exam",
    name: "試験対策",
    laws: [
      { id: "shoshi", name: "司法書士試験" },
      { id: "gyosei-shoshi", name: "行政書士試験" },
      { id: "shiho-yobi", name: "司法試験・予備試験" },
      { id: "shiho-shoshi-kirokuki", name: "司法書士（記述式対策）" },
      { id: "takken", name: "宅地建物取引士試験" },
      { id: "shakkin-sodan", name: "貸金業務取扱主任者試験" },
      { id: "fukan-shiken", name: "法科大学院入試（法律科目）" },
    ],
  },
];

export function getLawById(id: string): Law | undefined {
  for (const cat of LAW_CATEGORIES) {
    const law = cat.laws.find((l) => l.id === id);
    if (law) return law;
  }
}
