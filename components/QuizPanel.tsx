"use client";

import { useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { saveQuizScore, addHistory } from "@/lib/storage";

type Question = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  article: string;
};

type Props = {
  lawId: string;
  lawName: string;
};

const DIFFICULTIES = [
  { value: "easy", label: "基礎" },
  { value: "medium", label: "中級" },
  { value: "hard", label: "上級" },
];

export default function QuizPanel({ lawId, lawName }: Props) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [score, setScore] = useState({ correct: 0, total: 0 });

  async function fetchQuestion() {
    setLoading(true);
    setSelected(null);
    setQuestion(null);
    addHistory({ lawId, lawName, type: "quiz" });
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lawId, difficulty }),
    });
    const data = await res.json();
    setQuestion(data);
    setLoading(false);
  }

  function answer(idx: number) {
    if (selected !== null || !question) return;
    const isCorrect = idx === question.correct;
    setSelected(idx);
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    saveQuizScore(lawId, isCorrect ? 1 : 0, 1);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
                difficulty === d.value
                  ? "bg-amber-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <span className="text-slate-400 text-sm">
          {score.total > 0 && `${score.correct} / ${score.total} 正解（${Math.round((score.correct / score.total) * 100)}%）`}
        </span>
      </div>

      {!question && !loading && (
        <div className="text-center py-16">
          <p className="text-slate-400 mb-6">AIが問題を生成します</p>
          <button
            onClick={fetchQuestion}
            className="bg-amber-500 hover:bg-amber-400 text-white px-8 py-4 rounded-xl font-medium transition-colors text-base min-h-[52px]"
          >
            問題を出す
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          問題を生成中...
        </div>
      )}

      {question && !loading && (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <span className="text-xs text-amber-400 font-medium">{question.article}</span>
            <p className="text-white mt-2 leading-relaxed">{question.question}</p>
          </div>

          <div className="space-y-2">
            {question.options.map((opt, i) => {
              let style = "bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-500";
              if (selected !== null) {
                if (i === question.correct) style = "bg-green-900/50 border-green-500 text-green-200";
                else if (i === selected) style = "bg-red-900/50 border-red-500 text-red-200";
                else style = "bg-slate-800 border-slate-700 text-slate-500";
              }
              return (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  className={`w-full text-left border rounded-xl p-4 text-sm transition-all min-h-[52px] ${style}`}
                >
                  <span className="font-bold mr-2">{["A", "B", "C", "D"][i]}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                {selected === question.correct ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={selected === question.correct ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                  {selected === question.correct ? "正解！" : "不正解"}
                </span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{question.explanation}</p>
              <button
                onClick={fetchQuestion}
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm mt-2 min-h-[40px]"
              >
                <RefreshCw className="w-4 h-4" /> 次の問題
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
