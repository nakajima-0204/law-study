"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Check, Zap, ArrowLeft } from "lucide-react";

const FREE_FEATURES = [
  "AI解説 5回/日",
  "問題演習 10問/日",
  "判例検索 3回/日",
  "条文検索（無制限）",
  "メモ機能",
];

const PREMIUM_FEATURES = [
  "AI解説 無制限",
  "問題演習 無制限",
  "判例検索 無制限",
  "条文検索 無制限",
  "メモ機能 無制限",
  "模擬試験 無制限",
  "写真で問題解析",
];

function PricingContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const isPremium = user?.publicMetadata?.stripeSubscriptionStatus === "active";
  const success = searchParams.get("success") === "true";

  async function handleSubscribe() {
    if (!user) { router.push("/sign-up"); return; }
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url } = await res.json();
    window.location.href = url;
  }

  async function handlePortal() {
    setLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-14">
        <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> トップへ戻る
        </button>

        {success && (
          <div className="bg-green-900/40 border border-green-500 rounded-xl p-4 text-green-300 text-sm text-center">
            🎉 プレミアムプランへのアップグレードが完了しました！
          </div>
        )}

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">料金プラン</h1>
          <p className="text-slate-400">大学生向けのシンプルな料金設定</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* 無料プラン */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">無料プラン</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-bold text-white">¥0</span>
                <span className="text-slate-400 text-sm">/月</span>
              </div>
            </div>
            <ul className="space-y-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {!user && isLoaded && (
              <button
                onClick={() => router.push("/sign-up")}
                className="w-full py-3 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-sm font-medium transition-colors min-h-[48px]"
              >
                無料で始める
              </button>
            )}
            {user && !isPremium && (
              <div className="w-full py-3 rounded-xl bg-slate-700 text-slate-400 text-sm text-center">
                現在のプラン
              </div>
            )}
          </div>

          {/* プレミアムプラン */}
          <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-600/50 rounded-2xl p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              おすすめ
            </div>
            <div>
              <span className="text-xs text-amber-400 uppercase tracking-wider">プレミアムプラン</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-bold text-white">¥500</span>
                <span className="text-slate-400 text-sm">/月</span>
              </div>
            </div>
            <ul className="space-y-2">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-200">
                  <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {isPremium ? (
              <button
                onClick={handlePortal}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors min-h-[48px]"
              >
                サブスクを管理
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={loading || !isLoaded}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-sm font-bold transition-colors min-h-[48px] flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {loading ? "処理中..." : "プレミアムにアップグレード"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          クレジットカード決済 / いつでもキャンセル可能
        </p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}
