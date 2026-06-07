"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getFontSize, setFontSize, FontSize } from "@/lib/storage";
import { Home, TrendingUp, GraduationCap, Type } from "lucide-react";

const FONT_SIZES: FontSize[] = ["sm", "md", "lg"];
const FONT_LABELS: Record<FontSize, string> = { sm: "小", md: "中", lg: "大" };
const FONT_BASE: Record<FontSize, string> = { sm: "14px", md: "16px", lg: "18px" };

const NAV = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/progress", label: "進捗", icon: TrendingUp },
  { href: "/exam", label: "模擬試験", icon: GraduationCap },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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

  const isStudyPage = pathname.startsWith("/study/");

  return (
    <>
      {children}

      {/* ボトムナビ（スタディページ以外） */}
      {!isStudyPage && (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex items-center safe-bottom">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors min-h-[56px] ${
                  active ? "text-amber-400" : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={cycleFontSize}
            className="flex-1 flex flex-col items-center py-3 gap-1 text-slate-400 hover:text-white transition-colors min-h-[56px]"
          >
            <Type className="w-5 h-5" />
            <span className="text-xs">文字 {FONT_LABELS[fontSize]}</span>
          </button>
        </nav>
      )}

      {/* スタディページはヘッダーにフォントボタン（study page内で個別対応） */}
    </>
  );
}
