// e-Gov IDが有効かどうか一括チェック（XML解析版）
const BASE = "https://laws.e-gov.go.jp/api/1/lawdata/";
const DELAY = 400;

const laws = [
  // 公法
  { id: "gyosei-tetsuzuki", name: "行政手続法", egov_id: "405AC0000000088" },
  { id: "gyosei-fufuku", name: "行政不服申立法", egov_id: "426AC0000000068" },
  { id: "gyosei-jiken", name: "行政事件訴訟法", egov_id: "337AC0000000139" },
  { id: "kokka-baisho", name: "国家賠償法", egov_id: "322AC0000000125" },
  { id: "chiho-jichi", name: "地方自治法", egov_id: "322AC0000000067" },
  { id: "gyosei-daishikko", name: "行政代執行法", egov_id: "323AC0000000043" },
  { id: "joho-kokai", name: "情報公開法", egov_id: "411AC0000000042" },
  { id: "kojin-joho", name: "個人情報保護法", egov_id: "415AC0000000057" },
  { id: "kokka-komuin", name: "国家公務員法", egov_id: "322AC0000000120" },
  { id: "chiho-komuin", name: "地方公務員法", egov_id: "325AC0000000261" },
  { id: "jieitai", name: "自衛隊法", egov_id: "329AC0000000165" },
  { id: "keisatsu", name: "警察法", egov_id: "329AC0000000162" },
  { id: "shobo", name: "消防法", egov_id: "323AC1000000186" },
  { id: "doro-kotsu", name: "道路交通法", egov_id: "335AC0000000105" },
  { id: "koku", name: "航空法", egov_id: "327AC0000000231" },
  { id: "kokuseki", name: "国籍法", egov_id: "325AC0000000147" },
  { id: "nyukan", name: "出入国管理法", egov_id: "326CO0000000319" },
  { id: "koushoku-senkyo", name: "公職選挙法", egov_id: "325AC1000000100" },
  { id: "seiji-shikin", name: "政治資金規正法", egov_id: "351AC0000000194" },
  { id: "seitou-joseiho", name: "政党助成法", egov_id: "406AC0000000005" },
  { id: "kokumintohyo", name: "国民投票法", egov_id: "419AC0000000051" },
  { id: "keiho", name: "刑法", egov_id: "140AC0000000045" },
  { id: "sosoki", name: "組織的犯罪処罰法", egov_id: "411AC0000000136" },
  { id: "yakubutsu", name: "覚醒剤取締法", egov_id: "326AC0100000252" },
  { id: "dv-bo", name: "DV防止法", egov_id: "413AC0100000031" },
  { id: "strker-kisei", name: "ストーカー規制法", egov_id: "412AC0100000081" },
  { id: "saiban-in", name: "裁判員法", egov_id: "416AC0000000063" },
  { id: "boryokudan", name: "暴力団対策法", egov_id: "403AC0000000077" },
  { id: "cyber-crime", name: "不正アクセス禁止法", egov_id: "411AC0000000128" },
  { id: "shonen-ho", name: "少年法", egov_id: "323AC0000000168" },
  { id: "jido-fukushi", name: "児童福祉法", egov_id: "322AC0000000164" },
  { id: "jido-gyakutai", name: "児童虐待防止法", egov_id: "412AC1000000082" },
  { id: "kodomo-kihon", name: "こども基本法", egov_id: "504AC1000000077" },
  { id: "ijime-boshi", name: "いじめ防止対策推進法", egov_id: "425AC1000000071" },
  { id: "wakamono-shien", name: "子ども・若者育成支援推進法", egov_id: "421AC0000000071" },
  { id: "kodomo-hinkon", name: "子どもの貧困対策法", egov_id: "425AC0000000064" },
  { id: "shotoku-zei", name: "所得税法", egov_id: "340AC0000000033" },
  { id: "hojin-zei", name: "法人税法", egov_id: "340AC0000000034" },
  { id: "shohizei", name: "消費税法", egov_id: "363AC0000000108" },
  { id: "sozoku-zei", name: "相続税法", egov_id: "325AC0000000073" },
  { id: "kokuzei-tsusoku", name: "国税通則法", egov_id: "337AC0000000066" },
  { id: "kokuzei-choshu", name: "国税徴収法", egov_id: "334AC0000000147" },
  { id: "chiho-zei", name: "地方税法", egov_id: "325AC0000000226" },
  { id: "sozei-tokubetsu", name: "租税特別措置法", egov_id: "332AC0000000026" },
  { id: "zeimu-dairi", name: "税理士法", egov_id: "326AC1000000237" },
  { id: "doro-unso", name: "道路運送法", egov_id: "326AC0000000183" },
  { id: "tetsudo-jigyo", name: "鉄道事業法", egov_id: "361AC0000000092" },
  { id: "kaijo-unso", name: "海上運送法", egov_id: "324AC0000000187" },
  { id: "jibaiseki", name: "自動車損害賠償保障法", egov_id: "330AC0000000097" },
  { id: "doro-ho", name: "道路法", egov_id: "327AC1000000180" },
  { id: "denki-jigyo", name: "電気事業法", egov_id: "339AC0000000170" },
  { id: "gas-jigyo", name: "ガス事業法", egov_id: "329AC0000000051" },
  { id: "genshiryoku-kihon", name: "原子力基本法", egov_id: "330AC1000000186" },
  { id: "genshiryoku-kisei", name: "原子炉等規制法", egov_id: "332AC0000000166" },
  { id: "fit-ho", name: "再生可能エネルギー促進法", egov_id: "423AC0000000108" },
  { id: "gaito-ho", name: "外為法", egov_id: "324AC0000000228" },
  { id: "keizai-anpo-ho", name: "経済安全保障推進法", egov_id: "504AC0000000043" },
  // 私法
  { id: "minpo", name: "民法", egov_id: "129AC0000000089" },
  { id: "fudosan-toroki", name: "不動産登記法", egov_id: "416AC0000000123" },
  { id: "shakuchi-shakka", name: "借地借家法", egov_id: "403AC0000000090" },
  { id: "kokkyo-tatemono", name: "区分所有法", egov_id: "337AC0000000069" },
  { id: "shintaku", name: "信託法", egov_id: "418AC0000000108" },
  { id: "hasan", name: "破産法", egov_id: "416AC0000000075" },
  { id: "minzi-saisei", name: "民事再生法", egov_id: "411AC0000000225" },
  { id: "kaisha-kosei", name: "会社更生法", egov_id: "414AC0000000154" },
  { id: "doshi-saiken", name: "動産・債権譲渡特例法", egov_id: "410AC0000000104" },
  { id: "denshi-kiroku-saiken", name: "電子記録債権法", egov_id: "419AC0000000102" },
  { id: "shoho", name: "商法", egov_id: "132AC0000000048" },
  { id: "kaisha", name: "会社法", egov_id: "417AC0000000086" },
  { id: "tegata", name: "手形法", egov_id: "307AC0000000020" },
  { id: "kogitte", name: "小切手法", egov_id: "308AC0000000057" },
  { id: "hoken", name: "保険法", egov_id: "420AC0000000056" },
  { id: "kingyu-shohin", name: "金融商品取引法", egov_id: "323AC0000000025" },
  { id: "dokusen-kinshi", name: "独占禁止法", egov_id: "322AC0000000054" },
  { id: "fusei-kyoso", name: "不正競争防止法", egov_id: "405AC0000000047" },
  { id: "shohi-keiyaku", name: "消費者契約法", egov_id: "412AC0000000061" },
  { id: "halloppa", name: "割賦販売法", egov_id: "336AC0000000159" },
  { id: "tokutei-shoho", name: "特定商取引法", egov_id: "351AC0000000057" },
  { id: "kashikin", name: "貸金業法", egov_id: "358AC1000000032" },
  { id: "servicer", name: "サービサー法", egov_id: "410AC1000000126" },
  { id: "tokkyo", name: "特許法", egov_id: "334AC0000000121" },
  { id: "jitsuyoann", name: "実用新案法", egov_id: "334AC0000000123" },
  { id: "isho", name: "意匠法", egov_id: "334AC0000000125" },
  { id: "shouhyo", name: "商標法", egov_id: "334AC0000000127" },
  { id: "chosakuken", name: "著作権法", egov_id: "345AC0000000048" },
  { id: "shubyo", name: "種苗法", egov_id: "416AC0000000083" },
  { id: "ginko-ho", name: "銀行法", egov_id: "356AC0000000059" },
  { id: "hoken-gyoho", name: "保険業法", egov_id: "407AC0000000105" },
  { id: "shintaku-gyoho", name: "信託業法", egov_id: "416AC0000000154" },
  { id: "shikin-kessai-ho", name: "資金決済法", egov_id: "421AC0000000059" },
  { id: "yokin-hoken", name: "預金保険法", egov_id: "346AC0000000034" },
  { id: "kensetsu-gyoho", name: "建設業法", egov_id: "324AC0000000100" },
  { id: "kenchikushi-ho", name: "建築士法", egov_id: "325AC1000000202" },
  { id: "tochi-shuyou", name: "土地収用法", egov_id: "326AC0100000219" },
  // 訴訟法
  { id: "minsosho", name: "民事訴訟法", egov_id: "408AC0000000109" },
  { id: "minsikko", name: "民事執行法", egov_id: "354AC0000000004" },
  { id: "minhozen", name: "民事保全法", egov_id: "401AC0000000091" },
  { id: "minji-chosei", name: "民事調停法", egov_id: "326AC1000000222" },
  { id: "kazoku-jiken", name: "家事事件手続法", egov_id: "423AC0000000052" },
  { id: "chusai", name: "仲裁法", egov_id: "415AC0000000138" },
  { id: "adr", name: "ADR促進法", egov_id: "416AC0000000151" },
  { id: "keisosho", name: "刑事訴訟法", egov_id: "323AC0000000131" },
  { id: "keiji-shikko", name: "刑事収容施設法", egov_id: "417AC0000000050" },
  { id: "higaisha-hogo", name: "犯罪被害者等保護法", egov_id: "411AC0000000075" },
  { id: "higaisha-kyufu", name: "犯罪被害者給付金支給法", egov_id: "355AC0000000036" },
  { id: "saibansho", name: "裁判所法", egov_id: "322AC0000000059" },
  { id: "bengoshi", name: "弁護士法", egov_id: "324AC1000000205" },
  { id: "shiho-shoshi", name: "司法書士法", egov_id: "325AC1000000197" },
  { id: "gyosei-shoshi-ho", name: "行政書士法", egov_id: "326AC1000000004" },
  { id: "benrishi", name: "弁理士法", egov_id: "412AC0000000049" },
  { id: "cpa", name: "公認会計士法", egov_id: "323AC0000000103" },
  // 社会法
  { id: "rodo-kijun", name: "労働基準法", egov_id: "322AC0000000049" },
  { id: "rodo-keiyaku", name: "労働契約法", egov_id: "419AC0000000128" },
  { id: "rodo-kumiai", name: "労働組合法", egov_id: "324AC0000000174" },
  { id: "rodo-kankei-chosei", name: "労働関係調整法", egov_id: "321AC0000000025" },
  { id: "koyo-kinto", name: "男女雇用機会均等法", egov_id: "347AC0000000113" },
  { id: "ikuji-kaigo", name: "育児・介護休業法", egov_id: "403AC0000000076" },
  { id: "rodo-anzen", name: "労働安全衛生法", egov_id: "347AC0000000057" },
  { id: "haken-rodo", name: "労働者派遣法", egov_id: "360AC0000000088" },
  { id: "saiyo-antei", name: "職業安定法", egov_id: "322AC0000000141" },
  { id: "saichin", name: "最低賃金法", egov_id: "334AC0000000137" },
  { id: "pato-rodo", name: "パートタイム・有期雇用労働法", egov_id: "405AC0000000076" },
  { id: "rodo-shinpan", name: "労働審判法", egov_id: "416AC0000000045" },
  { id: "kogaisha-hogo", name: "公益通報者保護法", egov_id: "416AC0000000122" },
  { id: "danjo-sankaku", name: "男女共同参画社会基本法", egov_id: "411AC0000000078" },
  { id: "josei-katsuyaku", name: "女性活躍推進法", egov_id: "427AC0000000064" },
  { id: "gender-identity", name: "性同一性障害者特例法", egov_id: "416AC0000000111" },
  { id: "lgbt-rikai", name: "LGBT理解増進法", egov_id: "505AC1000000068" },
  { id: "shougaisha-sabetsu", name: "障害者差別解消法", egov_id: "425AC0000000065" },
  { id: "shougaisha-shien", name: "障害者総合支援法", egov_id: "417AC0000000123" },
  { id: "shougaisha-koyo", name: "障害者雇用促進法", egov_id: "335AC0000000123" },
  { id: "koreisha-fukushi", name: "老人福祉法", egov_id: "338AC0000000133" },
  { id: "kaigo-hoken", name: "介護保険法", egov_id: "409AC0000000123" },
  { id: "koreisha-gyakutai", name: "高齢者虐待防止法", egov_id: "417AC0000000124" },
  { id: "seineikouken2", name: "成年後見制度の利用促進法", egov_id: "428AC0000000029" },
  { id: "kenko-hoken", name: "健康保険法", egov_id: "211AC0000000070" },
  { id: "kosei-nenkin", name: "厚生年金保険法", egov_id: "329AC0000000115" },
  { id: "kokumin-nenkin", name: "国民年金法", egov_id: "334AC0000000141" },
  { id: "koyo-hoken", name: "雇用保険法", egov_id: "349AC0000000116" },
  { id: "rodo-sha-saigai", name: "労災保険法", egov_id: "322AC0000000050" },
  { id: "seikatsuhogo", name: "生活保護法", egov_id: "325AC0000000144" },
  { id: "jidou-teate", name: "児童手当法", egov_id: "346AC0000000073" },
  { id: "kankyo-kihon", name: "環境基本法", egov_id: "405AC0000000091" },
  { id: "taiki-osen", name: "大気汚染防止法", egov_id: "343AC0000000097" },
  { id: "suishitsu-odaku", name: "水質汚濁防止法", egov_id: "345AC0000000138" },
  { id: "junkan-shakai", name: "循環型社会形成推進基本法", egov_id: "412AC0000000110" },
  { id: "haikibutsu", name: "廃棄物処理法", egov_id: "345AC0000000137" },
  { id: "dojo-osen", name: "土壌汚染対策法", egov_id: "414AC0000000053" },
  { id: "ondanka-taisaku", name: "地球温暖化対策推進法", egov_id: "410AC0000000117" },
  { id: "shizen-hogo", name: "自然環境保全法", egov_id: "347AC0000000085" },
  { id: "tori-choju", name: "鳥獣保護管理法", egov_id: "414AC0000000088" },
  { id: "toshi-keikaku", name: "都市計画法", egov_id: "343AC0000000100" },
  { id: "kenchiku-kijun", name: "建築基準法", egov_id: "325AC0000000201" },
  { id: "nochi", name: "農地法", egov_id: "327AC0000000229" },
  { id: "ishi-ho", name: "医師法", egov_id: "323AC0000000201" },
  { id: "iryo-ho", name: "医療法", egov_id: "323AC0000000205" },
  { id: "yakki-ho", name: "薬機法", egov_id: "335AC0000000145" },
  { id: "seishin-hoken", name: "精神保健福祉法", egov_id: "325AC0100000123" },
  { id: "zoki-ishoku", name: "臓器移植法", egov_id: "409AC1000000104" },
  { id: "kansen-sho-ho", name: "感染症法", egov_id: "410AC0000000114" },
  { id: "kango-ho", name: "保健師助産師看護師法", egov_id: "323AC0000000203" },
  { id: "kinen-ho", name: "健康増進法", egov_id: "414AC0000000103" },
  { id: "kyoiku-kihon", name: "教育基本法", egov_id: "418AC0000000120" },
  { id: "gakko-kyoiku", name: "学校教育法", egov_id: "322AC0000000026" },
  { id: "shiritsu-gakko", name: "私立学校法", egov_id: "324AC0000000270" },
  { id: "shokuhin-eisei", name: "食品衛生法", egov_id: "322AC0000000233" },
  { id: "shokuhin-anzen", name: "食品安全基本法", egov_id: "415AC0000000048" },
  { id: "jas-ho", name: "JAS法", egov_id: "325AC0000000175" },
  { id: "keihyo-ho", name: "景品表示法", egov_id: "337AC0000000134" },
  { id: "gyogyo-ho", name: "漁業法", egov_id: "324AC0000000267" },
  { id: "shokuhin-label", name: "食品表示法", egov_id: "425AC0000000070" },
  { id: "npo-ho", name: "NPO法", egov_id: "410AC1000000007" },
  { id: "koeki-hojin", name: "公益社団法人及び公益財団法人認定法", egov_id: "418AC0000000049" },
  { id: "shakai-fukushi-hojin", name: "社会福祉法", egov_id: "326AC0000000045" },
  { id: "zaidan-hojin", name: "一般社団法人・財団法人法", egov_id: "418AC0000000048" },
  // デジタル法
  { id: "denshi-shomu", name: "電子署名法", egov_id: "412AC0000000102" },
  { id: "it-kihon", name: "デジタル社会形成基本法", egov_id: "503AC0000000035" },
  { id: "provider-sekinin", name: "プロバイダ責任制限法", egov_id: "413AC0000000137" },
  { id: "denki-tsushin", name: "電気通信事業法", egov_id: "359AC0000000086" },
  { id: "hoso-ho", name: "放送法", egov_id: "325AC0000000132" },
  { id: "uchu-kihon", name: "宇宙基本法", egov_id: "420AC0000000043" },
  { id: "uchu-katsudo", name: "宇宙活動法", egov_id: "428AC0000000076" },
  { id: "eisei-remote", name: "衛星リモートセンシング記録法", egov_id: "428AC0000000077" },
  { id: "denpa-ho", name: "電波法", egov_id: "325AC0000000131" },
  // 人権法
  { id: "hate-speech", name: "ヘイトスピーチ解消法", egov_id: "428AC0100000068" },
  { id: "buraku-sabetsu", name: "部落差別解消推進法", egov_id: "428AC1000000109" },
  { id: "higaisha-hogo2", name: "犯罪被害者等基本法", egov_id: "416AC1000000161" },
  // 国際私法
  { id: "horei", name: "法の適用に関する通則法", egov_id: "418AC0000000078" },
  { id: "kokusai-keiji-kyoryoku", name: "国際刑事共助法", egov_id: "355AC0000000069" },
  { id: "kensa-kijun", name: "公認会計士法(会計)", egov_id: "323AC0000000103" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ok = [];
const ng = [];

for (let i = 0; i < laws.length; i++) {
  const law = laws[i];
  try {
    const res = await fetch(`${BASE}${law.egov_id}`);
    if (!res.ok) {
      ng.push({ ...law, status: res.status, reason: `HTTP ${res.status}` });
      process.stdout.write(`  ✗ ${law.name} (${law.egov_id}) — HTTP ${res.status}\n`);
    } else {
      const xml = await res.text();
      const hasArticle = xml.includes("<Article ");
      if (hasArticle) {
        ok.push(law);
        process.stdout.write(`  ✓ ${law.name}\n`);
      } else {
        ng.push({ ...law, status: res.status, reason: "条文タグなし" });
        process.stdout.write(`  ✗ ${law.name} (${law.egov_id}) — 条文タグなし\n`);
      }
    }
  } catch (e) {
    ng.push({ ...law, status: "error", reason: String(e.message) });
    process.stdout.write(`  ✗ ${law.name} (${law.egov_id}) — ${e.message}\n`);
  }
  if (i < laws.length - 1) await sleep(DELAY);
}

console.log(`\n==============================`);
console.log(`✓ OK: ${ok.length}件`);
console.log(`✗ NG: ${ng.length}件`);
if (ng.length > 0) {
  console.log(`\n--- 条文なしリスト ---`);
  for (const l of ng) {
    console.log(`  ${l.name}  egov_id="${l.egov_id}"  (${l.reason})`);
  }
}
