"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHistory, HistoryEntry } from "@/lib/storage";
import { ArrowLeft, MessageSquare, Scale, Search, FileText, Clock, Trash2 } from "lucide-react";

const TAB_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; color: string; tab: string }> = {
  chat:     { label: "AI解説", icon: MessageSquare, color: "text-blue-400 bg-blue-900/30",    tab: "chat" },
  cases:    { label: "判例検索", icon: Scale,         color: "text-purple-400 bg-purple-900/30", tab: "cases" },
  articles: { label: "条文検索", icon: Search,        color: "text-amber-400 bg-amber-900/30",   tab: "articles" },
  notes:    { label: "メモ",     icon: FileText,      color: "text-green-400 bg-green-900/30",   tab: "notes" },
};

type FilterType = "all" | "chat" | "cases" | "articles";

export default function ProgressPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  function clearHistory() {
    if (!confirm("履歴をすべて削除しますか？")) return;
    localStorage.removeItem("lexai_history");
    setHistory([]);
  }

  const filtered = filter === "all" ? history : history.filter((h) => h.type === filter);

  // 日付でグループ化
  const grouped: Record<string, HistoryEntry[]> = {};
  for (const h of filtered) {
    const date = new Date(h.date).toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(h);
  }

  const FILTERS: { value: FilterType; label: string }[] = [
    { value: "all", label: "すべて" },
    { value: "chat", label: "AI解説" },
    { value: "cases", label: "判例" },
    { value: "articles", label: "条文" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-4 pt-14">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-white font-bold text-xl flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> 履歴
            </h1>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-slate-500 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* フィルター */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                filter === f.value
                  ? "bg-amber-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            履歴がありません
          </div>
        )}

        {/* 日付グループ */}
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date} className="space-y-2">
            <p className="text-xs text-slate-500 font-medium px-1">{date}</p>
            <div className="space-y-1.5">
              {entries.map((h) => {
                const config = TAB_CONFIG[h.type] ?? TAB_CONFIG.chat;
                const Icon = config.icon;
                return (
                  <button
                    key={h.id}
                    onClick={() => router.push(`/study/${h.lawId}?tab=${config.tab}`)}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-3 flex items-center gap-3 transition-all text-left min-h-[56px]"
                  >
                    <div className={`p-1.5 rounded-lg ${config.color.split(" ")[1]}`}>
                      <Icon className={`w-4 h-4 ${config.color.split(" ")[0]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{h.lawName}</p>
                      <p className="text-slate-400 text-xs">{config.label}</p>
                    </div>
                    <span className="text-slate-500 text-xs flex-shrink-0">
                      {new Date(h.date).toLocaleTimeString("ja-JP", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
