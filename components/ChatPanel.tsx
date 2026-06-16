"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Camera, Loader2 } from "lucide-react";
import { addHistory } from "@/lib/storage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type CaseContext = {
  title: string;
  court: string;
  date: string;
  citation?: string;
  summary: string;
  holding: string;
  significance: string;
};

type RelatedCase = {
  id: number;
  title: string;
  court: string;
  date: string;
  citation?: string;
  summary: string;
  holding: string;
  significance: string;
};

type Props = {
  lawId: string;
  lawName: string;
  caseContext?: CaseContext;
  initialUserMessage?: string;
  onSelectCase?: (c: RelatedCase) => void;
};

const STARTER_QUESTIONS = [
  "この法律の一番重要なポイントを3つ教えて",
  "試験に出やすい条文と論点は？",
  "具体的な事例で解説して",
  "代表的な判例と、そこから学ぶべきことは？",
];

const CASE_STARTER_QUESTIONS = [
  "この判例の重要性を簡単に教えて",
  "試験でどう問われる？",
  "この判例が確立した法理を解説して",
  "後続の判例・実務への影響は？",
];

export default function ChatPanel({ lawId, lawName, caseContext, initialUserMessage, onSelectCase }: Props) {
  const greeting = caseContext
    ? `**${caseContext.title}**について解説します。\n\n事案・判旨・意義、関連条文への適用など、何でも聞いてください。`
    : `**${lawName}**について何でも聞いてください。\n\n条文の解説、判例の分析、具体的な事例への適用など、お気軽にどうぞ。`;

  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [relatedCases, setRelatedCases] = useState<RelatedCase[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const didAutoSend = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialUserMessage && !didAutoSend.current) {
      didAutoSend.current = true;
      send(initialUserMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  async function send(text: string, imageBase64?: string) {
    if (!text.trim() && !imageBase64) return;
    addHistory({ lawId, lawName, type: "chat" });

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text || "（画像を送信しました）",
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, lawId, imageBase64, caseContext }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m))
      );
    }

    setLoading(false);

    // 最初のAI返答後に関連判例を取得（1回だけ）
    if (relatedCases.length === 0 && !caseContext) {
      fetch(`/api/cases?lawId=${encodeURIComponent(lawId)}`)
        .then(r => r.json())
        .then((cases: RelatedCase[]) => {
          if (Array.isArray(cases) && cases.length > 0) {
            // シャッフルして3件表示
            const shuffled = [...cases].sort(() => Math.random() - 0.5);
            setRelatedCases(shuffled.slice(0, 3));
          }
        })
        .catch(() => {});
    }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      send("この問題を解いて解説してください。", base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col h-[calc(100vh-108px)]">
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 mt-2 mb-2">
            {(caseContext ? CASE_STARTER_QUESTIONS : STARTER_QUESTIONS).map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500/60 hover:text-amber-400 transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                <span className="text-amber-400 text-xs font-bold">T</span>
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-800 text-slate-100 border border-slate-700"
              }`}
            >
              {m.content === "" && loading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              ) : m.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-bold text-amber-300 mt-3 mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>,
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-amber-300">{children}</strong>,
                    em: ({ children }) => <em className="text-slate-300 italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 pl-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 pl-2">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-200">{children}</li>,
                    code: ({ children }) => <code className="bg-slate-700 text-amber-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-amber-500 pl-3 text-slate-400 italic my-2">{children}</blockquote>,
                    hr: () => <hr className="border-slate-700 my-3" />,
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {/* 関連判例チップ */}
        {relatedCases.length > 0 && !loading && (
          <div className="mt-3 mb-1">
            <p className="text-xs text-slate-500 mb-2 px-1">関連判例</p>
            <div className="flex flex-col gap-1.5">
              {relatedCases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (onSelectCase) {
                      onSelectCase(c);
                    } else {
                      send(`「${c.title}」について詳しく教えてください。`);
                      setRelatedCases([]);
                    }
                  }}
                  className="text-left text-xs px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-colors group"
                >
                  <span className="text-amber-400 font-medium group-hover:text-amber-300 line-clamp-1">{c.title}</span>
                  <span className="text-slate-500 ml-1.5">{c.court} {c.date?.slice(0, 4)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力欄（固定） */}
      <div className="border-t border-slate-700 bg-slate-900 px-4 py-3">
        <div className="flex gap-2 items-end">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileRef}
            onChange={handleImage}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors flex-shrink-0"
          >
            <Camera className="w-5 h-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="質問を入力…（Shift+Enterで改行）"
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 resize-none overflow-hidden leading-relaxed"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
