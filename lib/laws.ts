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
      { id: "gyosei", name: "行政法（行政手続法）", egov_id: "405AC0000000088" },
      { id: "gyosei-fufuku", name: "行政不服申立法", egov_id: "426AC0000000068" },
      { id: "gyosei-jiken", name: "行政事件訴訟法", egov_id: "337AC0000000139" },
    ],
  },
  {
    id: "civil",
    name: "民法",
    laws: [
      { id: "minpo", name: "民法", egov_id: "129AC0000000089" },
      { id: "minpo-saiken", name: "民法（債権）", egov_id: "129AC0000000089" },
      { id: "shintoku", name: "不動産登記法", egov_id: "416AC0000000123" },
    ],
  },
  {
    id: "commercial",
    name: "商法・会社法",
    laws: [
      { id: "shoho", name: "商法", egov_id: "132AC0000000048" },
      { id: "kaisha", name: "会社法", egov_id: "417AC0000000086" },
      { id: "tegata", name: "手形法", egov_id: "107AC0000000020" },
    ],
  },
  {
    id: "criminal",
    name: "刑法・刑事訴訟法",
    laws: [
      { id: "keiho", name: "刑法", egov_id: "140AC0000000045" },
      { id: "keisosho", name: "刑事訴訟法", egov_id: "323AC0000000131" },
    ],
  },
  {
    id: "civil-procedure",
    name: "民事訴訟法・民事執行法",
    laws: [
      { id: "minsosho", name: "民事訴訟法", egov_id: "408AC0000000109" },
      { id: "minsikko", name: "民事執行法", egov_id: "354AC0000000004" },
      { id: "minhozen", name: "民事保全法", egov_id: "401AC0000000091" },
    ],
  },
  {
    id: "labor",
    name: "労働法",
    laws: [
      { id: "rodo-kijun", name: "労働基準法", egov_id: "322AC0000000049" },
      { id: "rodo-keiyaku", name: "労働契約法", egov_id: "419AC0000000128" },
      { id: "rodo-kumiai", name: "労働組合法", egov_id: "324AC0000000174" },
    ],
  },
  {
    id: "exam",
    name: "試験対策",
    laws: [
      { id: "shoshi", name: "司法書士試験", egov_id: undefined },
      { id: "gyosei-shoshi", name: "行政書士試験", egov_id: undefined },
      { id: "shiho", name: "司法試験・予備試験", egov_id: undefined },
    ],
  },
];

export function getLawById(id: string): Law | undefined {
  for (const cat of LAW_CATEGORIES) {
    const law = cat.laws.find((l) => l.id === id);
    if (law) return law;
  }
}
