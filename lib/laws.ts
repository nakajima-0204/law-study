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
      { id: "kenpo", name: "日本国憲法", egov_id: "321CONSTITUTION" },
      { id: "gyosei-tetsuzuki", name: "行政手続法", egov_id: "405AC0000000088" },
      { id: "gyosei-fufuku", name: "行政不服申立法", egov_id: "426AC0000000068" },
      { id: "gyosei-jiken", name: "行政事件訴訟法", egov_id: "337AC0000000139" },
      { id: "kokka-baisho", name: "国家賠償法", egov_id: "322AC0000000125" },
      { id: "chiho-jichi", name: "地方自治法", egov_id: "322AC0000000067" },
      { id: "kokka-komuin", name: "国家公務員法", egov_id: "322AC0000000120" },
      { id: "chiho-komuin", name: "地方公務員法", egov_id: "325AC0000000261" },
      { id: "joho-kokai", name: "情報公開法", egov_id: "411AC0000000042" },
      { id: "kojin-joho", name: "個人情報保護法", egov_id: "415AC0000000057" },
      { id: "gyosei-daishikko", name: "行政代執行法", egov_id: "323AC0000000043" },
    ],
  },
  {
    id: "civil",
    name: "民法",
    laws: [
      { id: "minpo-soron", name: "民法総則", egov_id: "129AC0000000089" },
      { id: "minpo-bukken", name: "民法（物権）", egov_id: "129AC0000000089" },
      { id: "minpo-saiken", name: "民法（債権総論）", egov_id: "129AC0000000089" },
      { id: "minpo-kakushu", name: "民法（各種契約）", egov_id: "129AC0000000089" },
      { id: "minpo-jiko", name: "民法（事務管理・不当利得・不法行為）", egov_id: "129AC0000000089" },
      { id: "minpo-kazoku", name: "民法（親族・相続）", egov_id: "129AC0000000089" },
      { id: "fudosan-toroki", name: "不動産登記法", egov_id: "416AC0000000123" },
      { id: "shakuchi-shakka", name: "借地借家法", egov_id: "403AC0000000090" },
      { id: "shintaku", name: "信託法", egov_id: "418AC0000000108" },
      { id: "hasan", name: "破産法", egov_id: "416AC0000000075" },
      { id: "minzi-saisei", name: "民事再生法", egov_id: "411AC0000000225" },
      { id: "kaisha-kosei", name: "会社更生法", egov_id: "414AC0000000154" },
    ],
  },
  {
    id: "commercial",
    name: "商法・会社法",
    laws: [
      { id: "shoho-soron", name: "商法総則・商行為", egov_id: "132AC0000000048" },
      { id: "kaisha-soron", name: "会社法（総則・設立）", egov_id: "417AC0000000086" },
      { id: "kaisha-kabushiki", name: "会社法（株式・新株予約権）", egov_id: "417AC0000000086" },
      { id: "kaisha-kikan", name: "会社法（機関）", egov_id: "417AC0000000086" },
      { id: "kaisha-kaikei", name: "会社法（計算・解散）", egov_id: "417AC0000000086" },
      { id: "kaisha-henshin", name: "会社法（組織再編）", egov_id: "417AC0000000086" },
      { id: "tegata", name: "手形法", egov_id: "107AC0000000020" },
      { id: "kogitte", name: "小切手法", egov_id: "108AC0000000057" },
      { id: "hoken", name: "保険法", egov_id: "420AC0000000056" },
      { id: "kaijo", name: "商法（海商）", egov_id: "132AC0000000048" },
      { id: "kingyu-shohin", name: "金融商品取引法", egov_id: "323AC0000000025" },
      { id: "dokusen-kinshi", name: "独占禁止法", egov_id: "322AC0000000054" },
      { id: "fusei-kyoso", name: "不正競争防止法", egov_id: "405AC0000000047" },
      { id: "shohi-keiyaku", name: "消費者契約法", egov_id: "412AC0000000061" },
      { id: "halloppa", name: "割賦販売法", egov_id: "336AC0000000159" },
    ],
  },
  {
    id: "criminal",
    name: "刑法・刑事訴訟法",
    laws: [
      { id: "keiho-soron", name: "刑法総論", egov_id: "140AC0000000045" },
      { id: "keiho-kakuron", name: "刑法各論", egov_id: "140AC0000000045" },
      { id: "keisosho", name: "刑事訴訟法", egov_id: "323AC0000000131" },
      { id: "keiji-shikko", name: "刑事収容施設法", egov_id: "417AC0000000050" },
      { id: "saiban-in", name: "裁判員法", egov_id: "416AC0000000063" },
      { id: "sosoki", name: "組織的犯罪処罰法", egov_id: "411AC0000000136" },
      { id: "yakubutsu", name: "薬物関連法（覚醒剤取締法等）", egov_id: "326AC0000000252" },
      { id: "dv-bo", name: "DV防止法", egov_id: "413AC0000000031" },
      { id: "strker-kisei", name: "ストーカー規制法", egov_id: "412AC0000000081" },
      { id: "jido-fukushi-keiho", name: "児童福祉法（刑事規定）", egov_id: "322AC0000000164" },
    ],
  },
  {
    id: "civil-procedure",
    name: "民事訴訟・執行・保全",
    laws: [
      { id: "minsosho", name: "民事訴訟法", egov_id: "408AC0000000109" },
      { id: "minsikko", name: "民事執行法", egov_id: "354AC0000000004" },
      { id: "minhozen", name: "民事保全法", egov_id: "401AC0000000091" },
      { id: "saibansho", name: "裁判所法", egov_id: "322AC0000000059" },
      { id: "bengoshi", name: "弁護士法", egov_id: "324AC0000000205" },
      { id: "chusai", name: "仲裁法", egov_id: "415AC0000000138" },
      { id: "minji-chosei", name: "民事調停法", egov_id: "326AC0000000222" },
      { id: "kazoku-jiken", name: "家事事件手続法", egov_id: "423AC0000000052" },
    ],
  },
  {
    id: "labor",
    name: "労働法",
    laws: [
      { id: "rodo-kijun", name: "労働基準法", egov_id: "322AC0000000049" },
      { id: "rodo-keiyaku", name: "労働契約法", egov_id: "419AC0000000128" },
      { id: "rodo-kumiai", name: "労働組合法", egov_id: "324AC0000000174" },
      { id: "rodo-kankei-chosei", name: "労働関係調整法", egov_id: "321AC0000000025" },
      { id: "koyo-kinto", name: "男女雇用機会均等法", egov_id: "347AC0000000113" },
      { id: "ikuji-kaigo", name: "育児・介護休業法", egov_id: "403AC0000000076" },
      { id: "rodo-anzen", name: "労働安全衛生法", egov_id: "347AC0000000057" },
      { id: "koyo-hoken", name: "雇用保険法", egov_id: "349AC0000000116" },
      { id: "rodo-sha-saigai", name: "労災保険法", egov_id: "322AC0000000050" },
      { id: "haken-rodo", name: "労働者派遣法", egov_id: "360AC0000000088" },
      { id: "saiyo-antei", name: "職業安定法", egov_id: "322AC0000000141" },
      { id: "saichin", name: "最低賃金法", egov_id: "334AC0000000137" },
    ],
  },
  {
    id: "intellectual",
    name: "知的財産法",
    laws: [
      { id: "tokkyo", name: "特許法", egov_id: "334AC0000000121" },
      { id: "jitsuyoann", name: "実用新案法", egov_id: "334AC0000000123" },
      { id: "isho", name: "意匠法", egov_id: "334AC0000000125" },
      { id: "shouhyo", name: "商標法", egov_id: "334AC0000000127" },
      { id: "chosakuken", name: "著作権法", egov_id: "345AC0000000048" },
      { id: "fusei-kyoso-chizai", name: "不正競争防止法（知財）", egov_id: "405AC0000000047" },
      { id: "shubyo", name: "種苗法", egov_id: "416AC0000000083" },
    ],
  },
  {
    id: "tax",
    name: "税法",
    laws: [
      { id: "shotoku-zei", name: "所得税法", egov_id: "340AC0000000033" },
      { id: "hojin-zei", name: "法人税法", egov_id: "340AC0000000034" },
      { id: "shohizei", name: "消費税法", egov_id: "363AC0000000108" },
      { id: "sozoku-zei", name: "相続税法", egov_id: "325AC0000000073" },
      { id: "fudosan-shotoku", name: "租税特別措置法（不動産）", egov_id: "332AC0000000026" },
      { id: "kokuzei-tsusoku", name: "国税通則法", egov_id: "337AC0000000066" },
      { id: "kokuzei-choshu", name: "国税徴収法", egov_id: "334AC0000000147" },
      { id: "chiho-zei", name: "地方税法", egov_id: "325AC0000000226" },
    ],
  },
  {
    id: "social",
    name: "社会保障法",
    laws: [
      { id: "kenko-hoken", name: "健康保険法", egov_id: "211AC0000000070" },
      { id: "kosei-nenkin", name: "厚生年金保険法", egov_id: "329AC0000000115" },
      { id: "kokumin-nenkin", name: "国民年金法", egov_id: "334AC0000000141" },
      { id: "kaigo-hoken", name: "介護保険法", egov_id: "409AC0000000123" },
      { id: "seikatsuhogo", name: "生活保護法", egov_id: "325AC0000000144" },
      { id: "shougaisha", name: "障害者総合支援法", egov_id: "424AC0000000151" },
      { id: "jidou-teate", name: "児童手当法", egov_id: "346AC0000000073" },
    ],
  },
  {
    id: "environmental",
    name: "環境法・その他",
    laws: [
      { id: "kankyo-kihon", name: "環境基本法", egov_id: "405AC0000000091" },
      { id: "taiki-osen", name: "大気汚染防止法", egov_id: "343AC0000000097" },
      { id: "suishitsu-odaku", name: "水質汚濁防止法", egov_id: "345AC0000000138" },
      { id: "junkan-shakai", name: "循環型社会形成推進基本法", egov_id: "412AC0000000110" },
      { id: "toshi-keikaku", name: "都市計画法", egov_id: "343AC0000000100" },
      { id: "kenchiku-kijun", name: "建築基準法", egov_id: "325AC0000000201" },
      { id: "nochi", name: "農地法", egov_id: "327AC0000000229" },
      { id: "kokkyo-tatemono", name: "区分所有法", egov_id: "337AC0000000069" },
    ],
  },
  {
    id: "digital",
    name: "デジタル・新領域",
    laws: [
      { id: "fusei-access", name: "不正アクセス禁止法", egov_id: "411AC0000000128" },
      { id: "denshi-shomu", name: "電子署名法", egov_id: "412AC0000000102" },
      { id: "it-kihon", name: "デジタル社会形成基本法", egov_id: "433AC0000000035" },
      { id: "ai-kisoku", name: "AI・データ関連法規（最新動向）" },
      { id: "crypto-asset", name: "資金決済法（暗号資産）", egov_id: "421AC0000000059" },
      { id: "drone-kisoku", name: "航空法（ドローン規制）", egov_id: "327AC0000000231" },
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
