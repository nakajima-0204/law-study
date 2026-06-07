"use client";

import { useState } from "react";
import { Loader2, Search, BookMarked, Clock, ChevronDown, ChevronUp } from "lucide-react";

type Case = {
  title: string;
  court: string;
  date: string;
  summary: string;
  holding: string;
  significance: string;
  citation: string;
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
      <div className="flex gap-2 flex-wrap">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                type === t.value
                  ? "bg-amber-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {type === "search" && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchCases()}
          placeholder="キーワードを入力（例：不法行為、解雇、担保）"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
        />
      )}

      {cases.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4 text-sm">
            {type === "landmark" && "この法律の重要判例をAIが検索・整理します"}
            {type === "recent" && "直近の新判例・法改正をAIがリアルタイムで調査します"}
            {type === "search" && "キーワードで関連判例を検索します"}
          </p>
          <button
            onClick={fetchCases}
            disabled={type === "search" && !query.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            {type === "search" ? "検索する" : "調査する"}
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Google検索で判例を調査中...
        </div>
      )}

      {cases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">{cases.length}件の判例・事例</span>
            <button
              onClick={fetchCases}
              className="text-amber-400 hover:text-amber-300 text-sm"
            >
              再調査
            </button>
          </div>

          {cases.map((c, i) => (
            <div
              key={i}
              className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full text-left p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        {c.court}
                      </span>
                      <span className="text-xs text-slate-500">{c.date}</span>
                      {c.citation && (
                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                          {c.citation}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-medium text-sm">{c.title}</h3>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">{c.summary}</p>
                  </div>
                  {expanded === i ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                  )}
                </div>
              </button>

              {expanded === i && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
                  <div>
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">判旨・要旨</span>
                    <p className="text-slate-300 text-sm mt-1 leading-relaxed">{c.holding}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">重要性・実務影響</span>
                    <p className="text-slate-300 text-sm mt-1 leading-relaxed">{c.significance}</p>
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
