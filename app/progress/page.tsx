"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHistory, getNotes, HistoryEntry } from "@/lib/storage";
import { ArrowLeft, BookOpen, FileText, MessageSquare, Scale, Search } from "lucide-react";

export default function ProgressPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [noteCount, setNoteCount] = useState(0);

  useEffect(() => {
    setHistory(getHistory());
    setNoteCount(getNotes().length);
  }, []);

  const studiedLaws = new Set(history.map((h) => h.lawId)).size;
  const chatCount = history.filter((h) => h.type === "chat").length;
  const casesCount = history.filter((h) => h.type === "cases").length;
  const articlesCount = history.filter((h) => h.type === "articles").length;
  const recentHistory = history.slice(0, 30);

  const TYPE_LABEL: Record<string, string> = {
    chat: "AI解説",
    cases: "判例・事例",
    articles: "条文検索",
    notes: "メモ",
  };

  const TYPE_ICON: Record<string, typeof MessageSquare> = {
    chat: MessageSquare,
    cases: Scale,
    articles: Search,
    notes: FileText,
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-14">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white font-bold text-xl">学習進捗</h1>
        </div>

        {/* サマリー */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "学習した法律", value: `${studiedLaws}件`, icon: BookOpen, color: "text-amber-400" },
            { label: "AI解説", value: `${chatCount}回`, icon: MessageSquare, color: "text-blue-400" },
            { label: "判例検索", value: `${casesCount}回`, icon: Scale, color: "text-purple-400" },
            { label: "メモ", value: `${noteCount}件`, icon: FileText, color: "text-green-400" },
          ].map((item) => (
            <div key={item.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* 最近の学習 */}
        {recentHistory.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm">最近の学習</h2>
            <div className="space-y-2">
              {recentHistory.map((h) => {
                const Icon = TYPE_ICON[h.type] ?? MessageSquare;
                return (
                  <div key={h.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <button
                        onClick={() => router.push(`/study/${h.lawId}`)}
                        className="text-sm text-slate-300 hover:text-amber-400 transition-colors"
                      >
                        {h.lawName}
                      </button>
                      <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                        {TYPE_LABEL[h.type] ?? h.type}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(h.date).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            まだ学習記録がありません。<br />法律を選んで学習を始めましょう。
          </div>
        )}
      </div>
    </div>
  );
}
