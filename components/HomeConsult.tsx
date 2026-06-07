"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, MessageSquare, Scale, X, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getLawById } from "@/lib/laws";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
};

const SUGGESTIONS = [
  "正当防衛が成立するための要件は？判例はどう判断している？",
  "SNSで誹謗中傷された場合、不法行為と名誉毀損罪はどう違う？",
  "相続放棄しても連帯保証債務はどうなる？学説の対立は？",
  "解雇権濫用法理について判例と学説の見解は？",
  "占有と所有権の関係を民法でどう整理する？",
];

export default function HomeConsult() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function parseSuggestions(text: string): { clean: string; ids: string[] } {
    const match = text.match(/\[SUGGEST:\s*([^\]]+)\]/);
    if (!match) return { clean: text, ids: [] };
    const ids = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    const clean = text.replace(/\[SUGGEST:[^\]]+\]/, "").trim();
    return { clean, ids };
  }

  async function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    const res = await fetch("/api/consult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value);
      const { clean } = parseSuggestions(full);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: clean } : m))
      );
    }

    const { clean, ids } = parseSuggestions(full);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId ? { ...m, content: clean, suggestions: ids } : m
      )
    );
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl px-5 py-4 text-left transition-all group active:scale-95"
      >
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 font-semibold text-sm">法律をAIに質問する</p>
          <p className="text-slate-500 text-xs mt-0.5">事例・判例・学説について深く解説します</p>
        </div>
        <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
      </button>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-white text-sm font-semibold">法律AI</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* メッセージ */}
      <div className="h-72 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm text-center">
              事例・判例・学説について何でも聞いてください
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-colors border border-slate-700 hover:border-slate-600"
                >
                  💬 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                <span className="text-amber-400 text-xs font-bold">T</span>
              </div>
            )}
            <div className="max-w-[85%] space-y-2">
              <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-700 text-slate-200"
              }`}>
                {m.content === "" && loading ? (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                ) : m.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="text-amber-300 font-semibold">{children}</strong>,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>

              {/* 法律提案カード */}
              {m.suggestions && m.suggestions.length > 0 && (
                <div className="space-y-1.5">
                  {m.suggestions.map((id) => {
                    const law = getLawById(id);
                    if (!law) return null;
                    return (
                      <div key={id} className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5">
                        <p className="text-white text-xs font-medium mb-2">{law.name}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/study/${id}?tab=chat`)}
                            className="flex items-center gap-1 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 px-2.5 py-1 rounded-lg text-xs transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" /> AI解説
                          </button>
                          <button
                            onClick={() => router.push(`/study/${id}?tab=cases`)}
                            className="flex items-center gap-1 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 px-2.5 py-1 rounded-lg text-xs transition-colors"
                          >
                            <Scale className="w-3 h-3" /> 判例検索
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div className="border-t border-slate-700 px-3 py-3">
        <div className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            placeholder="事例・判例・学説について質問…"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
