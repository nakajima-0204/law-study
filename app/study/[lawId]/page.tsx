"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLawById, AutoLaw } from "@/lib/laws";
import autoLawsData from "@/data/auto-laws.json";
import ChatPanel from "@/components/ChatPanel";
import QuizPanel from "@/components/QuizPanel";
import CasesPanel from "@/components/CasesPanel";
import NotesPanel from "@/components/NotesPanel";
import ArticleSearchPanel from "@/components/ArticleSearchPanel";
import { getFontSize, setFontSize, FontSize } from "@/lib/storage";
import { ArrowLeft, MessageSquare, Brain, Scale, FileText, BookOpen, Type } from "lucide-react";

const autoLaws = autoLawsData as AutoLaw[];

const TABS = [
  { id: "chat", label: "AI解説", icon: MessageSquare },
  { id: "cases", label: "判例", icon: Scale },
  { id: "articles", label: "条文", icon: BookOpen },
  { id: "quiz", label: "演習", icon: Brain },
  { id: "notes", label: "メモ", icon: FileText },
];

const FONT_SIZES: FontSize[] = ["sm", "md", "lg"];
const FONT_LABELS: Record<FontSize, string> = { sm: "小", md: "中", lg: "大" };
const FONT_BASE: Record<FontSize, string> = { sm: "14px", md: "16px", lg: "18px" };

export default function StudyPage() {
  const { lawId } = useParams<{ lawId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState("chat");
  const [fontSize, setFs] = useState<FontSize>("md");

  useEffect(() => {
    const saved = getFontSize();
    setFs(saved);
    document.documentElement.style.fontSize = FONT_BASE[saved];
  }, []);

  function cycleFontSize() {
    const next = FONT_SIZES[(FONT_SIZES.indexOf(fontSize) + 1) % FONT_SIZES.length];
    setFs(next);
    setFontSize(next);
    document.documentElement.style.fontSize = FONT_BASE[next];
  }

  const law = getLawById(lawId, autoLaws);
  if (!law) return <p className="text-white p-8">法律が見つかりません</p>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center gap-2">
        <button
          onClick={() => router.push("/")}
          className="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-semibold flex-1 text-sm truncate min-w-0">{law.name}</h1>
        <button
          onClick={cycleFontSize}
          className="text-slate-400 hover:text-white p-1 flex-shrink-0 flex items-center gap-0.5"
          title="フォントサイズ"
        >
          <Type className="w-4 h-4" />
          <span className="text-xs">{FONT_LABELS[fontSize]}</span>
        </button>
      </header>

      {/* タブバー（横スクロール） */}
      <div className="bg-slate-800 border-b border-slate-700 flex overflow-x-auto scrollbar-none">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 flex-shrink-0 min-h-[48px] ${
                tab === t.id
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <main className="flex-1 overflow-y-auto">
        {tab === "chat" && <ChatPanel lawId={lawId} lawName={law.name} />}
        {tab === "cases" && <CasesPanel lawId={lawId} />}
        {tab === "articles" && (
          <ArticleSearchPanel lawId={lawId} lawName={law.name} egov_id={law.egov_id} />
        )}
        {tab === "quiz" && <QuizPanel lawId={lawId} lawName={law.name} />}
        {tab === "notes" && <NotesPanel lawId={lawId} lawName={law.name} />}
      </main>
    </div>
  );
}
