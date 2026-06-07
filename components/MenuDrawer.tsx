"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getFontSize, setFontSize, FontSize } from "@/lib/storage";
import {
  Menu, X, Home, TrendingUp, GraduationCap, Type, BookOpen, ChevronRight,
} from "lucide-react";

const NAV = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/progress", label: "学習進捗", icon: TrendingUp },
  { href: "/exam", label: "模擬試験", icon: GraduationCap },
];

const FONT_SIZES: FontSize[] = ["sm", "md", "lg"];
const FONT_LABELS: Record<FontSize, string> = { sm: "小", md: "中", lg: "大" };
const FONT_BASE: Record<FontSize, string> = { sm: "14px", md: "16px", lg: "18px" };

export default function MenuDrawer() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFs] = useState<FontSize>("md");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = getFontSize();
    setFs(saved);
    document.documentElement.style.fontSize = FONT_BASE[saved];
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function cycleFontSize() {
    const next = FONT_SIZES[(FONT_SIZES.indexOf(fontSize) + 1) % FONT_SIZES.length];
    setFs(next);
    setFontSize(next);
    document.documentElement.style.fontSize = FONT_BASE[next];
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {/* ハンバーガーボタン */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-40 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/90 backdrop-blur border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all shadow-lg"
        aria-label="メニューを開く"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* オーバーレイ */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ドロワー */}
      <div
        className={`fixed top-0 left-0 h-full w-72 z-50 bg-slate-900 border-r border-slate-700 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <div>
              <span className="text-white font-bold text-lg">Themisia</span>
              <span className="text-amber-400/70 text-xs ml-1">テミシア</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-xs text-slate-500 uppercase tracking-widest px-3 mb-3">メニュー</p>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all min-h-[48px] ${
                  active
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4 opacity-60" />}
              </button>
            );
          })}

          <div className="border-t border-slate-800 my-4" />
          <p className="text-xs text-slate-500 uppercase tracking-widest px-3 mb-3">設定</p>

          {/* フォントサイズ */}
          <div className="px-4 py-3 bg-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">文字サイズ</span>
            </div>
            <div className="flex gap-2">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setFs(size);
                    setFontSize(size);
                    document.documentElement.style.fontSize = FONT_BASE[size];
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
                    fontSize === size
                      ? "bg-amber-500 text-white"
                      : "bg-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {FONT_LABELS[size]}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* フッター */}
        <div className="px-5 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-600 text-center">
            Powered by Gemini + e-Gov
          </p>
        </div>
      </div>
    </>
  );
}
