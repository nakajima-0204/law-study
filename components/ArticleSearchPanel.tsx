"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, BookOpen, ChevronDown, ChevronUp, FileText, List } from "lucide-react";
import { addHistory } from "@/lib/storage";

type Article = {
  num: string;
  title: string;
  text: string;
  paragraphs: string[];
};

type Props = {
  lawId: string;
  lawName: string;
  egov_id?: string;
};

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
function circled(n: number) {
  return CIRCLED[n] ?? `(${n + 1})`;
}

function toHalfWidth(s: string) {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

function parseArticleNum(query: string): string | null {
  const m = query.trim().match(/^第?(\d+)条/);
  return m ? m[1] : null;
}

function ArticleCard({
  article,
  expanded,
  onToggle,
}: {
  article: Article;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div id={`article-${article.num}`} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden scroll-mt-4">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${expanded ? "bg-amber-400" : "bg-amber-500/60"}`} />
          <span className="text-white text-sm font-semibold">{article.title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-700 px-4 py-4 space-y-3">
          {article.paragraphs.length > 1 ? (
            article.paragraphs.map((p, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-amber-400 text-sm font-bold flex-shrink-0 w-5">
                  {circled(i)}
                </span>
                <p className="text-slate-300 text-sm leading-loose">{p}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-300 text-sm leading-loose">{article.paragraphs[0]}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ArticleSearchPanel({ lawId, lawName, egov_id }: Props) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedSearch, setExpandedSearch] = useState<string | null>(null);

  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [expandedAll, setExpandedAll] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pendingJump, setPendingJump] = useState<string | null>(null);

  useEffect(() => {
    if (!egov_id) return;
    setAllLoading(true);
    fetch(`/api/articles?egov_id=${egov_id}`)
      .then((r) => r.json())
      .then((data) => setAllArticles(Array.isArray(data) ? data : []))
      .finally(() => setAllLoading(false));
  }, [egov_id]);

  useEffect(() => {
    if (!pendingJump || !showAll) return;
    const timer = setTimeout(() => {
      document.getElementById(`article-${pendingJump}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setPendingJump(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [pendingJump, showAll]);

  async function search() {
    if (!query.trim() || !egov_id) return;

    const articleNum = parseArticleNum(query);
    if (articleNum && allArticles.length > 0) {
      const target = allArticles.find(
        (a) =>
          a.num === articleNum ||
          toHalfWidth(a.title).includes(`第${articleNum}条`)
      );
      if (target) {
        setShowAll(true);
        setExpandedAll(target.num);
        setPendingJump(target.num);
        return;
      }
    }

    setSearchLoading(true);
    setSearched(true);
    setSearchResults([]);
    addHistory({ lawId, lawName, type: "articles" });

    const res = await fetch(`/api/articles?egov_id=${egov_id}&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setSearchResults(Array.isArray(data) ? data : []);
    setSearchLoading(false);
  }

  if (!egov_id) {
    return (
      <div className="p-4 text-center py-16 text-slate-500 text-sm">
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p>この法律は条文データベース（e-Gov）未対応です</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* 条文検索 */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="条番号 or キーワード（例：1条、第3条、不法行為）"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={search}
            disabled={!query.trim() || searchLoading}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white px-4 rounded-xl transition-colors active:scale-95"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {searchLoading && (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span className="text-sm">e-Gov から取得中…</span>
          </div>
        )}

        {searched && !searchLoading && searchResults.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />「{query}」に一致する条文が見つかりませんでした
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 px-1">{searchResults.length}件ヒット</p>
            {searchResults.map((a) => (
              <ArticleCard
                key={a.num}
                article={a}
                expanded={expandedSearch === a.num}
                onToggle={() => setExpandedSearch(expandedSearch === a.num ? null : a.num)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 全条文一覧 */}
      <div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-left transition-colors hover:border-slate-600"
        >
          <div className="flex items-center gap-2.5">
            <List className="w-4 h-4 text-amber-400" />
            <span className="text-white text-sm font-semibold">全条文一覧</span>
            {allLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
            ) : (
              <span className="text-xs text-slate-500">{allArticles.length}条</span>
            )}
          </div>
          {showAll ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAll && (
          <div className="mt-2 space-y-2">
            {allLoading && (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                <span className="text-sm">条文を読み込み中…</span>
              </div>
            )}
            {!allLoading && allArticles.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                条文データが取得できませんでした
              </div>
            )}
            {allArticles.map((a) => (
              <ArticleCard
                key={a.num}
                article={a}
                expanded={expandedAll === a.num}
                onToggle={() => setExpandedAll(expandedAll === a.num ? null : a.num)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
