"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, MessageSquare, Scale, X } from "lucide-react";

type Result = {
  id: string;
  name: string;
  reason: string;
};

export default function LawSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    setResults(data);
    setLoading(false);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(() => search(q), 500);
  }

  function clear() {
    setQuery("");
    setResults([]);
  }

  function navigate(id: string, tab: string) {
    clear();
    router.push(`/study/${id}?tab=${tab}`);
  }

  return (
    <div className="relative">
      <div className={`flex items-center gap-2 bg-slate-800 border rounded-2xl px-4 py-3 transition-colors ${
        focused ? "border-amber-500" : "border-slate-700"
      }`}>
        {loading ? (
          <Loader2 className="w-4 h-4 text-slate-400 flex-shrink-0 animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="法律名・キーワードで検索（例：離婚、解雇、著作権）"
          className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
        />
        {query && (
          <button onClick={clear} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 検索結果ドロップダウン */}
      {(results.length > 0 || (loading && query)) && focused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl z-50">
          {loading && results.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> 検索中...
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={r.id}
              className={`px-4 py-3 ${i !== 0 ? "border-t border-slate-700" : ""}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-white text-sm font-medium">{r.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{r.reason}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onMouseDown={() => navigate(r.id, "chat")}
                  className="flex items-center gap-1.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> AI解説
                </button>
                <button
                  onMouseDown={() => navigate(r.id, "cases")}
                  className="flex items-center gap-1.5 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  <Scale className="w-3.5 h-3.5" /> 判例検索
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
