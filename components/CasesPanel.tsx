"use client";

import { useState, useEffect } from "react";
import {
  Loader2, Search, ChevronDown, ChevronUp, Scale,
  BookOpen, MessageSquare,
} from "lucide-react";

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

type ExplainResult = { easy: string; legal: string; practical: string };

type Props = {
  lawId: string;
  lawName?: string;
  onChatAboutCase?: (c: Case) => void;
};

const EXPLAIN_TABS: { key: keyof ExplainResult; label: string; color: string }[] = [
  { key: "easy", label: "わかりやすく", color: "text-emerald-400" },
  { key: "legal", label: "法律的解説", color: "text-amber-400" },
  { key: "practical", label: "実務的視点", color: "text-blue-400" },
];

function CaseCard({
  c, expanded, onToggle, lawId, onChatAboutCase,
}: {
  c: Case;
  expanded: boolean;
  onToggle: () => void;
  lawId: string;
  onChatAboutCase?: (c: Case) => void;
}) {
  const [explainTab, setExplainTab] = useState<keyof ExplainResult>("easy");
  const [explain, setExplain] = useState<ExplainResult | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  async function loadExplain() {
    if (explain) { setShowExplain(!showExplain); return; }
    setShowExplain(true);
    setExplainLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lawId, type: "explain", caseData: c }),
      });
      const data = await res.json();
      if (data.easy) setExplain(data);
    } finally {
      setExplainLoading(false);
    }
  }

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
            {c.article && (
              <span className={`text-xs text-blue-400 ${!expanded ? "line-clamp-1" : ""}`}>📖 {c.article}</span>
            )}
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
            {c.holding ? (
              <p className="text-slate-300 text-sm leading-relaxed">{c.holding}</p>
            ) : (
              <p className="text-slate-500 text-xs italic">判旨の要約は掲載なし。詳細は全文（courts.go.jp）をご確認ください。</p>
            )}
          </div>
          {c.significance && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">重要性・実務影響</p>
              <p className="text-slate-300 text-sm leading-relaxed">{c.significance}</p>
            </div>
          )}
          {/* アクションボタン */}
          <div className="flex gap-2 pt-1 flex-wrap">
            <button
              onClick={loadExplain}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                showExplain
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-slate-700 border-slate-600 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />AI解説
            </button>
            {onChatAboutCase && (
              <button
                onClick={() => onChatAboutCase(c)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-slate-700 border-slate-600 text-slate-300 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />AIに聞く
              </button>
            )}
          </div>

          {/* 難易度別解説パネル */}
          {showExplain && (
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
              {explainLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />解説を生成中…
                </div>
              ) : explain ? (
                <>
                  <div className="flex gap-1 mb-3">
                    {EXPLAIN_TABS.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setExplainTab(t.key)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                          explainTab === t.key
                            ? `bg-slate-700 ${t.color} font-medium`
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">{explain[explainTab]}</p>
                </>
              ) : (
                <p className="text-slate-500 text-xs">解説の取得に失敗しました</p>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const DISPLAY_COUNT = 5;

export default function CasesPanel({ lawId, lawName, onChatAboutCase }: Props) {
  const [searchMode, setSearchMode] = useState<"keyword" | "situation">("keyword");
  const [query, setQuery] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [landmark, setLandmark] = useState<Case[]>([]);
  const [displayed, setDisplayed] = useState<Case[]>([]);
  const [landmarkLoading, setLandmarkLoading] = useState(false);

  useEffect(() => {
    const cacheKey = `themisia_cases_v2_${lawId}`;
    const CACHE_TTL = 3 * 24 * 60 * 60 * 1000; // 3日
    const CACHE_MAX = 200; // localStorage には最大200件
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (Array.isArray(data) && data.length > 0 && Date.now() - ts < CACHE_TTL) {
          setLandmark(data);
          setDisplayed(pickRandom(data, DISPLAY_COUNT));
          return;
        }
      } catch { /* ignore */ }
    }
    setLandmarkLoading(true);
    const url = `/api/cases?lawId=${encodeURIComponent(lawId)}${lawName ? `&lawName=${encodeURIComponent(lawName)}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setLandmark(d);
          setDisplayed(pickRandom(d, DISPLAY_COUNT));
          try {
            // 大量件数はランダムサンプルのみキャッシュ
            const toCache = d.length > CACHE_MAX ? pickRandom(d, CACHE_MAX) : d;
            localStorage.setItem(cacheKey, JSON.stringify({ data: toCache, ts: Date.now() }));
          } catch { /* quota exceeded → skip */ }
        }
      })
      .catch(() => {})
      .finally(() => setLandmarkLoading(false));
  }, [lawId, lawName]);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setCases([]);
    setExpanded(null);

    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lawId, type: searchMode === "situation" ? "situation" : "search", query }),
    });
    const data = await res.json();
    setCases(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  return (
    <div className="p-4 space-y-4">
      {/* 検索バー */}
      <div className="space-y-2">
        <div className="flex gap-1">
          <button
            onClick={() => setSearchMode("keyword")}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              searchMode === "keyword"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            🔍 キーワード
          </button>
          <button
            onClick={() => setSearchMode("situation")}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              searchMode === "situation"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            📖 状況から探す
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder={
              searchMode === "situation"
                ? "例：賃貸物件の家主が退去後に敷金を返さない"
                : "例：不法行為、解雇、担保"
            }
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
      </div>

      {cases.length === 0 && !loading && !searched && landmark.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-slate-500">判例 {landmark.length}件中 ランダム{displayed.length}件表示</p>
            <button
              onClick={() => { setDisplayed(pickRandom(landmark, DISPLAY_COUNT)); setExpanded(null); }}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              ↻ 再抽選
            </button>
          </div>
          {displayed.map((c, i) => (
            <CaseCard
              key={`${c.title}-${i}`}
              c={c}
              expanded={expanded === -(i + 1)}
              onToggle={() => setExpanded(expanded === -(i + 1) ? null : -(i + 1))}
              lawId={lawId}
              onChatAboutCase={onChatAboutCase}
            />
          ))}
        </div>
      )}

      {cases.length === 0 && !loading && !searched && landmark.length === 0 && landmarkLoading && (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          <p className="text-sm">重要判例を取得中…</p>
        </div>
      )}

      {cases.length === 0 && !loading && !searched && landmark.length === 0 && !landmarkLoading && (
        <div className="text-center py-14">
          <Scale className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">キーワードまたは状況を入力して判例を検索します</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          <p className="text-sm">
            {searchMode === "situation" ? "状況に関連する判例を検索中…" : "判例を検索中…"}
          </p>
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
              lawId={lawId}
              onChatAboutCase={onChatAboutCase}
            />
          ))}
        </div>
      )}
    </div>
  );
}
