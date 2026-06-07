"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHistory, getQuizScores, getNotes, HistoryEntry, QuizScore } from "@/lib/storage";
import { ArrowLeft, TrendingUp, BookOpen, FileText, AlertTriangle } from "lucide-react";

type ScoreEntry = { lawId: string; lawName: string; score: QuizScore };

export default function ProgressPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [noteCount, setNoteCount] = useState(0);

  useEffect(() => {
    const h = getHistory();
    setHistory(h);
    setNoteCount(getNotes().length);

    const rawScores = getQuizScores();
    // 法律名は履歴から逆引き
    const nameMap: Record<string, string> = {};
    for (const e of h) nameMap[e.lawId] = e.lawName;

    const entries: ScoreEntry[] = Object.entries(rawScores).map(([lawId, score]) => ({
      lawId,
      lawName: nameMap[lawId] ?? lawId,
      score,
    }));
    entries.sort((a, b) => {
      const ra = a.score.correct / (a.score.total || 1);
      const rb = b.score.correct / (b.score.total || 1);
      return ra - rb; // 正答率低い順（苦手順）
    });
    setScores(entries);
  }, []);

  const totalQuestions = scores.reduce((n, s) => n + s.score.total, 0);
  const totalCorrect = scores.reduce((n, s) => n + s.score.correct, 0);
  const overallRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

  const studiedLaws = new Set(history.map((h) => h.lawId)).size;
  const recentHistory = history.slice(0, 20);

  const TYPE_LABEL: Record<string, string> = {
    chat: "AI解説",
    quiz: "問題演習",
    cases: "判例・事例",
    articles: "条文検索",
    notes: "メモ",
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white font-bold text-xl">学習進捗</h1>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "学習した法律", value: `${studiedLaws}件`, icon: BookOpen, color: "text-amber-400" },
            { label: "解いた問題", value: `${totalQuestions}問`, icon: TrendingUp, color: "text-blue-400" },
            { label: "総合正答率", value: overallRate !== null ? `${overallRate}%` : "—", icon: TrendingUp, color: "text-green-400" },
            { label: "メモ数", value: `${noteCount}件`, icon: FileText, color: "text-purple-400" },
          ].map((item) => (
            <div key={item.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* 苦手分野 */}
        {scores.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-white font-semibold text-sm">法律別スコア（正答率低い順）</h2>
            </div>
            <div className="space-y-2">
              {scores.map((s) => {
                const rate = Math.round((s.score.correct / s.score.total) * 100);
                const barColor = rate < 50 ? "bg-red-500" : rate < 70 ? "bg-amber-500" : "bg-green-500";
                return (
                  <div key={s.lawId} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => router.push(`/study/${s.lawId}`)}
                        className="text-sm text-slate-300 hover:text-amber-400 transition-colors text-left"
                      >
                        {s.lawName}
                      </button>
                      <span className="text-xs text-slate-400">
                        {s.score.correct}/{s.score.total}問 ({rate}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 学習履歴 */}
        {recentHistory.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm">最近の学習</h2>
            <div className="space-y-2">
              {recentHistory.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-1">
                  <div>
                    <button
                      onClick={() => router.push(`/study/${h.lawId}`)}
                      className="text-sm text-slate-300 hover:text-amber-400 transition-colors"
                    >
                      {h.lawName}
                    </button>
                    <span className="ml-2 text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                      {TYPE_LABEL[h.type]}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(h.date).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              ))}
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
