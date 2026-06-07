"use client";

import { useState } from "react";
import { Loader2, Search, BookMarked, Clock, ChevronDown, ChevronUp, ExternalLink, Scale } from "lucide-react";

type Case = {
  title: string;
  court: string;
  date: string;
  summary: string;
  holding: string;
  significance: string;
  citation: string;
  article?: string;
  source?: string;
};

type Props = {
  lawId: string;
};

const TYPES = [
  { value: "landmark", label: "重要判例", icon: BookMarked },
  { value: "recent", label: "最新動向", icon: Clock },
  { value: "search", label: "検索", icon: Search },
];

export default function CasesPanel({ lawId }: Props) {
  const [type, setType] = useState("landmark");
  const [query, setQuery] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function fetchCases() {
    setLoading(true);
    setCases([]);
    setExpanded(null);
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lawId, type, query }),
    });
    const data = await res.json();
    setCases(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  return (
    <div className="p-4 space-y-4">
      {/* タイプ切替 */}
      <div className="flex gap-2">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                type === t.value
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                  : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {type === "search" && (
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCases()}
            placeholder="キーワードを入力（例：不法行為、解雇、担保）"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={fetchCases}
            disabled={!query.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white px-4 rounded-xl"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      )}

      {cases.length === 0 && !loading && (
        <div className="text-center py-14">
          <Scale className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">
            {type === "landmark" && "重要判例をAIが検索・整理します"}
            {type === "recent" && "直近の新判例・法改正をリアルタイムで調査します"}
            {type === "search" && "キーワードで関連判例を検索します"}
          </p>
          <button
            onClick={fetchCases}
            disabled={type === "search" && !query.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-95"
          >
            {type === "search" ? "検索する" : "調査する"}
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          <p className="text-sm">Google検索で判例を調査中…</p>
        </div>
      )}

      {cases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-slate-400 text-xs">{cases.length}件の判例・事例</span>
            <button onClick={fetchCases} className="text-amber-400 hover:text-amber-300 text-xs">
              再調査
            </button>
          </div>

          {cases.map((c, i) => (
            <div
              key={i}
              className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full text-left p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* バッジ行 */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                        {c.court}
                      </span>
                      <span className="text-xs text-slate-500">{c.date}</span>
                      {c.citation && (
                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                          {c.citation}
                        </span>
                      )}
                    </div>
                    {/* 判例名 */}
                    <h3 className="text-white font-semibold text-sm leading-snug mb-1">{c.title}</h3>
                    {/* 条文 */}
                    {c.article && (
                      <span className="text-xs text-blue-400">📖 {c.article}</span>
                    )}
                    {/* 概要（折りたたみ時） */}
                    {expanded !== i && (
                      <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">{c.summary}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    {expanded === i ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              {expanded === i && (
                <div className="border-t border-slate-700 px-4 py-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">事案の概要</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{c.summary}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">判旨・要旨</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{c.holding}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">重要性・実務影響</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{c.significance}</p>
                  </div>
                  {c.source && (
                    <a
                      href={c.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      出典: {c.source}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
