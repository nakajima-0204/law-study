const EGOV_BASE = "https://laws.e-gov.go.jp/api/1";

export type ArticleResult = {
  num: string;
  title: string;
  text: string;
  paragraphs: string[];
};

export async function fetchLawArticles(lawId: string): Promise<ArticleResult[]> {
  try {
    const res = await fetch(`${EGOV_BASE}/lawdata/${lawId}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseArticles(xml);
  } catch {
    return [];
  }
}

export async function searchLawList(keyword: string): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch(
      `${EGOV_BASE}/lawlists/1?keyword=${encodeURIComponent(keyword)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const results: { id: string; name: string }[] = [];
    const matches = xml.matchAll(/<LawId>(.*?)<\/LawId>[\s\S]*?<LawName>(.*?)<\/LawName>/g);
    for (const m of matches) {
      results.push({ id: m[1], name: m[2] });
    }
    return results.slice(0, 10);
  } catch {
    return [];
  }
}

function parseArticles(xml: string): ArticleResult[] {
  const articles: ArticleResult[] = [];
  const articleBlocks = xml.matchAll(/<Article\b[^>]*\bNum="([^"]+)"[^>]*>([\s\S]*?)<\/Article>/g);

  for (const block of articleBlocks) {
    const num = block[1];
    const inner = block[2];

    const titleMatch = inner.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
    const title = titleMatch ? stripTags(titleMatch[1]) : `第${num}条`;

    const paragraphs: string[] = [];
    const paraBlocks = inner.matchAll(/<Paragraph\b[^>]*>([\s\S]*?)<\/Paragraph>/g);
    for (const p of paraBlocks) {
      const text = stripTags(p[1]).trim();
      if (text) paragraphs.push(text);
    }

    if (paragraphs.length > 0) {
      articles.push({ num, title, text: paragraphs.join("\n"), paragraphs });
    }
  }

  return articles;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function articlesToContext(articles: ArticleResult[], maxChars = 8000): string {
  let out = "";
  for (const a of articles) {
    const line = `${a.title}\n${a.text}\n\n`;
    if (out.length + line.length > maxChars) break;
    out += line;
  }
  return out.trim();
}
