"use client";

import { useState } from "react";
import { Search, Loader2, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { addHistory } from "@/lib/storage";

type Article = {
  num: string;
  title: string;
  text: string;
};

type Props = {
  lawId: string;
  lawName: string;
  egov_id?: string;
};

export default function ArticleSearchPanel({ lawId, lawName, egov_id }: Props) {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (!query.trim() || !egov_id) return;
    setLoading(true);
    setSearched(true);
    setArticles([]);
    addHistory({ lawId, lawName, type: "articles" });

    const res = await fetch(`/api/articles?egov_id=${egov_id}&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setArticles(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  if (!egov_id) {
    return (
      <div className="p-4 text-center py-16 text-slate-500 text-sm">
        <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
        この法律は条文データベース（e-Gov）未対応です
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="条文キーワードを入力（例：不法行為、時効、解除）"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 min-h-[48px]"
        />
        <button
          onClick={search}
          disabled={!query.trim() || loading}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white px-4 rounded-xl transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          e-Gov から条文を取得中...
        </div>
      )}

      {searched && !loading && articles.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          「{query}」に一致する条文が見つかりませんでした
        </div>
      )}

      {articles.length > 0 && (
        <div className="space-y-2">
          <span className="text-slate-400 text-xs">{articles.length}件の条文</span>
          {articles.map((a) => (
            <div key={a.num} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === a.num ? null : a.num)}
                className="w-full text-left p-4 flex items-center justify-between gap-2"
              >
                <div>
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full mr-2">
                    {a.title}
                  </span>
                </div>
                {expanded === a.num ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </button>
              {expanded === a.num && (
                <div className="px-4 pb-4 border-t border-slate-700 pt-3">
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{a.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
