"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLawById } from "@/lib/laws";
import ChatPanel from "@/components/ChatPanel";
import QuizPanel from "@/components/QuizPanel";
import { ArrowLeft, MessageSquare, Brain } from "lucide-react";

const TABS = [
  { id: "chat", label: "AI解説", icon: MessageSquare },
  { id: "quiz", label: "問題演習", icon: Brain },
];

export default function StudyPage() {
  const { lawId } = useParams<{ lawId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState("chat");

  const law = getLawById(lawId);
  if (!law) return <p className="text-white p-8">法律が見つかりません</p>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-semibold flex-1">{law.name}</h1>
        <div className="flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-amber-500 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {tab === "chat" && <ChatPanel lawId={lawId} lawName={law.name} />}
        {tab === "quiz" && <QuizPanel lawId={lawId} />}
      </main>
    </div>
  );
}
