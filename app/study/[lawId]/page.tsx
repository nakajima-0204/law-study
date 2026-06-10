"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getLawById, AutoLaw } from "@/lib/laws";
import autoLawsData from "@/data/auto-laws.json";
import ChatPanel from "@/components/ChatPanel";
import CasesPanel from "@/components/CasesPanel";
import NotesPanel from "@/components/NotesPanel";
import ArticleSearchPanel from "@/components/ArticleSearchPanel";
import { ArrowLeft, MessageSquare, Scale, FileText, BookOpen } from "lucide-react";

type CaseForChat = {
  title: string; court: string; date: string; citation?: string;
  summary: string; holding: string; significance: string;
};

const autoLaws = autoLawsData as AutoLaw[];

const TABS = [
  { id: "chat", label: "AI解説", icon: MessageSquare },
  { id: "cases", label: "判例", icon: Scale },
  { id: "articles", label: "条文", icon: BookOpen },
  { id: "notes", label: "メモ", icon: FileText },
];

export default function StudyPage() {
  const { lawId } = useParams<{ lawId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") ?? "chat");
  const [caseForChat, setCaseForChat] = useState<CaseForChat | undefined>();
  const [chatInitMsg, setChatInitMsg] = useState<string | undefined>();

  const handleChatAboutCase = useCallback((c: CaseForChat) => {
    setCaseForChat(c);
    setChatInitMsg(`「${c.title}」について詳しく教えてください。この判例が確立した法理・実務への影響・試験での重要ポイントを解説してください。`);
    setTab("chat");
  }, []);

  const law = getLawById(lawId, autoLaws);
  if (!law) return <p className="text-white p-8">法律が見つかりません</p>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center gap-2">
        <div className="w-10 flex-shrink-0" />
        <h1 className="text-white font-semibold flex-1 text-sm truncate min-w-0 text-center">
          {law.name}
        </h1>
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white transition-colors flex-shrink-0 w-10 flex items-center justify-end"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

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

      <main className="flex-1 overflow-hidden">
        {tab === "chat" && (
          <ChatPanel
            key={chatInitMsg}
            lawId={lawId}
            lawName={law.name}
            caseContext={caseForChat}
            initialUserMessage={chatInitMsg}
          />
        )}
        {tab === "cases" && (
          <div className="h-[calc(100vh-108px)] overflow-y-auto">
            <CasesPanel lawId={lawId} lawName={law.name} onChatAboutCase={handleChatAboutCase} />
          </div>
        )}
        {tab === "articles" && (
          <div className="h-[calc(100vh-108px)] overflow-y-auto">
            <ArticleSearchPanel lawId={lawId} lawName={law.name} egov_id={law.egov_id} />
          </div>
        )}
        {tab === "notes" && (
          <div className="h-[calc(100vh-108px)] overflow-y-auto">
            <NotesPanel lawId={lawId} lawName={law.name} />
          </div>
        )}
      </main>
    </div>
  );
}
