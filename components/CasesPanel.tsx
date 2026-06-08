"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, ChevronDown, ChevronUp, ExternalLink, Scale } from "lucide-react";

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

function CaseCard({ c, expanded, onToggle }: { c: Case; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
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
            <h3 className="text-white font-semibold text-sm leading-snug mb-1">{c.title}</h3>
            {c.article && <span className="text-xs text-blue-400">📖 {c.article}</span>}
            {!expanded && (
              <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">{c.summary}</p>
            )}
          </div>
          <div className="flex-shrink-0 mt-1">
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </button>

      {expanded && (
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
            <a href={c.source} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors">
              <ExternalLink className="w-3 h-3" />出典: {c.source}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function CasesPanel({ lawId }: Props) {
  const [query, setQuery] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [landmark, setLandmark] = useState<Case[]>([]);

  useEffect(() => {
    fetch(`/api/cases?lawId=${encodeURIComponent(lawId)}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d) && d.length > 0) setLandmark(d); })
      .catch(() => {});
  }, [lawId]);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setCases([]);
    setExpanded(null);

    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lawId, type: "search", query }),
    });
    const data = await res.json();
    setCases(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="キーワードを入力（例：不法行為、解雇、担保）"
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

      {cases.length === 0 && !loading && !searched && landmark.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 px-1">重要判例</p>
          {landmark.map((c, i) => (
            <CaseCard
              key={i}
              c={c}
              expanded={expanded === -(i + 1)}
              onToggle={() => setExpanded(expanded === -(i + 1) ? null : -(i + 1))}
            />
          ))}
        </div>
      )}

      {cases.length === 0 && !loading && !searched && landmark.length === 0 && (
        <div className="text-center py-14">
          <Scale className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">キーワードで関連判例を検索します</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          <p className="text-sm">判例を検索中…</p>
        </div>
      )}

      {searched && !loading && cases.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-6">「{query}」に一致する判例が見つかりませんでした</p>
      )}

      {cases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-slate-400 text-xs">{cases.length}件</span>
            <button onClick={search} className="text-amber-400 hover:text-amber-300 text-xs">再検索</button>
          </div>
          {cases.map((c, i) => (
            <CaseCard
              key={i}
              c={c}
              expanded={expanded === i}
              onToggle={() => setExpanded(expanded === i ? null : i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
