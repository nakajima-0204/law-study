"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LAW_DOMAINS } from "@/lib/laws";
import { saveQuizScore, addHistory } from "@/lib/storage";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Trophy } from "lucide-react";

type Question = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  article: string;
  lawName: string;
  lawId: string;
};

type ExamState = "setup" | "running" | "result";

const COUNTS = [5, 10, 20];

export default function ExamPage() {
  const router = useRouter();
  const [state, setState] = useState<ExamState>("setup");
  const [selectedLaws, setSelectedLaws] = useState<{ id: string; name: string }[]>([]);
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  const allLaws = LAW_DOMAINS.flatMap((d) => d.categories.flatMap((c) => c.laws));

  function toggleLaw(law: { id: string; name: string }) {
    setSelectedLaws((prev) =>
      prev.find((l) => l.id === law.id)
        ? prev.filter((l) => l.id !== law.id)
        : [...prev, law]
    );
  }

  async function startExam() {
    if (selectedLaws.length === 0) return;
    setLoading(true);
    setState("running");
    setCurrent(0);
    setAnswers([]);

    const generated: Question[] = [];
    const perLaw = Math.max(1, Math.ceil(count / selectedLaws.length));

    for (const law of selectedLaws) {
      const needed = Math.min(perLaw, count - generated.length);
      for (let i = 0; i < needed; i++) {
        try {
          const res = await fetch("/api/quiz", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lawId: law.id, difficulty: "medium" }),
          });
          const q = await res.json();
          if (q.question) generated.push({ ...q, lawName: law.name, lawId: law.id });
        } catch {}
      }
      if (generated.length >= count) break;
    }

    setQuestions(generated.slice(0, count));
    setLoading(false);
  }

  function answer(idx: number) {
    if (answers[current] !== undefined) return;
    const q = questions[current];
    saveQuizScore(q.lawId, idx === q.correct ? 1 : 0, 1);
    addHistory({ lawId: q.lawId, lawName: q.lawName, type: "quiz" });
    const next = [...answers, idx];
    setAnswers(next);
    if (next.length === questions.length) {
      setTimeout(() => setState("result"), 800);
    } else {
      setTimeout(() => setCurrent((c) => c + 1), 800);
    }
  }

  const correct = answers.filter((a, i) => a === questions[i]?.correct).length;

  if (state === "setup") {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-white font-bold text-xl">模擬試験</h1>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <h2 className="text-amber-400 font-semibold text-sm">問題数</h2>
            <div className="flex gap-2">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCount(c)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                    count === c ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  {c}問
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-amber-400 font-semibold text-sm">出題範囲を選択</h2>
              <span className="text-xs text-slate-400">{selectedLaws.length}件選択中</span>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {LAW_DOMAINS.map((domain) => (
                <div key={domain.id}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{domain.name}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {domain.categories.flatMap((c) => c.laws).map((law) => {
                      const sel = selectedLaws.some((l) => l.id === law.id);
                      return (
                        <button
                          key={law.id}
                          onClick={() => toggleLaw(law)}
                          className={`text-left text-xs px-3 py-2 rounded-lg border transition-all min-h-[40px] ${
                            sel
                              ? "bg-amber-500/20 border-amber-500 text-amber-300"
                              : "bg-slate-700 border-slate-600 text-slate-400 hover:text-white"
                          }`}
                        >
                          {law.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={startExam}
            disabled={selectedLaws.length === 0}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white py-4 rounded-xl font-bold text-base transition-colors min-h-[56px]"
          >
            試験開始
          </button>
        </div>
      </div>
    );
  }

  if (loading || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p>問題を生成中...</p>
        </div>
      </div>
    );
  }

  if (state === "result") {
    const rate = Math.round((correct / questions.length) * 100);
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-white font-bold text-xl text-center pt-4">試験結果</h1>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-3">
            <Trophy className={`w-12 h-12 mx-auto ${rate >= 70 ? "text-amber-400" : "text-slate-500"}`} />
            <p className="text-5xl font-bold text-white">{rate}%</p>
            <p className="text-slate-400">{questions.length}問中 {correct}問正解</p>
            <p className="text-sm text-slate-500">
              {rate >= 80 ? "優秀！" : rate >= 60 ? "もう少し！" : "復習が必要です"}
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => {
              const isCorrect = answers[i] === q.correct;
              return (
                <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-xs text-slate-400">{q.lawName} / {q.article}</span>
                  </div>
                  <p className="text-white text-sm">{q.question}</p>
                  {!isCorrect && (
                    <p className="text-slate-400 text-xs leading-relaxed border-t border-slate-700 pt-2">
                      正解: {q.options[q.correct]}<br />
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setState("setup")}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-white py-4 rounded-xl font-bold min-h-[56px]"
            >
              もう一度
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold min-h-[56px]"
            >
              トップへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const answered = answers[current];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setState("setup")} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-white font-semibold">{current + 1} / {questions.length}</span>
        <span className="text-slate-400 text-sm">{Math.round((correct / Math.max(current, 1)) * 100)}%</span>
      </header>

      <div className="w-full bg-slate-700 h-1">
        <div
          className="bg-amber-500 h-1 transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <span className="text-xs text-amber-400">{q.lawName} / {q.article}</span>
          <p className="text-white mt-2 leading-relaxed">{q.question}</p>
        </div>

        <div className="space-y-2">
          {q.options.map((opt, i) => {
            let style = "bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-500";
            if (answered !== undefined) {
              if (i === q.correct) style = "bg-green-900/50 border-green-500 text-green-200";
              else if (i === answered) style = "bg-red-900/50 border-red-500 text-red-200";
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

        {answered !== undefined && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 leading-relaxed">
            {q.explanation}
          </div>
        )}
      </main>
    </div>
  );
}
