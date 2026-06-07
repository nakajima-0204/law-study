"use client";

import { useState } from "react";
import { Search, Loader2, BookOpen, ChevronDown, ChevronUp, FileText } from "lucide-react";
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
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p>この法律は条文データベース（e-Gov）未対応です</p>
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
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={search}
          disabled={!query.trim() || loading}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white px-4 rounded-xl transition-colors active:scale-95"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-14 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <span className="text-sm">e-Gov から条文を取得中…</span>
        </div>
      )}

      {searched && !loading && articles.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          「{query}」に一致する条文が見つかりませんでした
        </div>
      )}

      {!searched && (
        <div className="text-center py-14 text-slate-500 text-sm">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>e-Gov公式データベースから条文を検索します</p>
          <p className="text-xs mt-1 text-slate-600">キーワードを入力して検索してください</p>
        </div>
      )}

      {articles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 px-1">{articles.length}件の条文が見つかりました</p>
          {articles.map((a) => (
            <div key={a.num} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === a.num ? null : a.num)}
                className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="text-white text-sm font-semibold">{a.title}</span>
                </div>
                {expanded === a.num ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {expanded === a.num && (
                <div className="border-t border-slate-700 px-4 py-4">
                  <p className="text-slate-300 text-sm leading-loose whitespace-pre-wrap font-mono">{a.text}</p>
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <a
                      href={`https://laws.e-gov.go.jp/law/${a.num}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
                    >
                      e-Gov で確認する →
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
