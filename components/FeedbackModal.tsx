"use client";

import { useState } from "react";
import { X, Send, CheckCircle2, Loader2, MessageSquarePlus } from "lucide-react";

type Category = "feature" | "law" | "bug" | "other";

const CATEGORIES: { value: Category; label: string; placeholder: string }[] = [
  { value: "feature", label: "機能追加", placeholder: "例：判例の要約を自動生成してほしい" },
  { value: "law", label: "法律追加", placeholder: "例：薬機法・医療法を追加してほしい" },
  { value: "bug", label: "バグ報告", placeholder: "例：民法を選んだとき条文検索が動かない" },
  { value: "other", label: "その他", placeholder: "ご意見・ご要望をご自由に" },
];

type Props = {
  onClose: () => void;
};

export default function FeedbackModal({ onClose }: Props) {
  const [category, setCategory] = useState<Category>("feature");
  const [message, setMessage] = useState("");
  const [lawRequest, setLawRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const current = CATEGORIES.find((c) => c.value === category)!;

  async function submit() {
    if (!message.trim()) return;
    setLoading(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, message, lawRequest }),
    });
    setLoading(false);
    if (res.ok) setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold">フィードバックを送る</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-12 px-5 gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
            <p className="text-white font-semibold text-lg">送信しました！</p>
            <p className="text-slate-400 text-sm text-center">
              フィードバックありがとうございます。<br />内容を確認して改善に活かします。
            </p>
            <button
              onClick={onClose}
              className="mt-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl text-sm"
            >
              閉じる
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* カテゴリ */}
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">カテゴリ</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      category === c.value
                        ? "bg-amber-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 法律名（法律追加のみ） */}
            {category === "law" && (
              <div>
                <p className="text-xs text-slate-400 font-medium mb-2">希望する法律・分野</p>
                <input
                  value={lawRequest}
                  onChange={(e) => setLawRequest(e.target.value)}
                  placeholder="例：薬機法、医療法、航空法"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* メッセージ */}
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">詳細</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={current.placeholder}
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* 送信 */}
            <button
              onClick={submit}
              disabled={!message.trim() || loading}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? "送信中…" : "送信する"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
