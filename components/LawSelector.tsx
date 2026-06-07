"use client";

import { useState } from "react";
import { LAW_DOMAINS, LawDomain, AutoLaw } from "@/lib/laws";
import autoLawsData from "@/data/auto-laws.json";
import { BookOpen, ArrowLeft, ChevronRight, Sparkles, Scale } from "lucide-react";
import LawSearch from "@/components/LawSearch";
import HomeConsult from "@/components/HomeConsult";

const autoLaws = autoLawsData as AutoLaw[];

const DOMAIN_ICONS: Record<string, string> = {
  public: "🏛️",
  private: "⚖️",
  procedural: "🔍",
  social: "🤝",
  international: "🌏",
  digital: "💻",
  "human-rights": "🕊️",
  "current-topics": "📰",
};

type Props = {
  onSelect: (lawId: string) => void;
};

export default function LawSelector({ onSelect }: Props) {
  const [selectedDomain, setSelectedDomain] = useState<LawDomain | null>(null);

  if (selectedDomain) {
    const domainAutoLaws = autoLaws.filter((l) => l.domain === selectedDomain.id);

    return (
      <div className="min-h-screen bg-slate-900 p-4 pb-8">
        <div className="max-w-2xl mx-auto pt-14">
          <button
            onClick={() => setSelectedDomain(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">大分類に戻る</span>
          </button>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{DOMAIN_ICONS[selectedDomain.id] ?? "📚"}</span>
            <div>
              <h2 className="text-xl font-bold text-white">{selectedDomain.name}</h2>
              <p className="text-slate-400 text-xs mt-0.5">{selectedDomain.description}</p>
            </div>
          </div>

          <div className="space-y-5">
            {selectedDomain.categories.map((cat) => (
              <div key={cat.id}>
                <h3 className="text-amber-400 font-semibold text-xs uppercase tracking-widest mb-2 px-1">
                  {cat.name}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {cat.laws.map((law) => (
                    <button
                      key={law.id}
                      onClick={() => onSelect(law.id)}
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/60 text-white rounded-xl p-3.5 text-left transition-all group active:scale-95"
                    >
                      <span className="text-sm font-medium group-hover:text-amber-300 transition-colors leading-snug">
                        {law.name}
                      </span>
                    </button>
                  ))}
                  {domainAutoLaws
                    .filter((l) => l.category === cat.id)
                    .map((law) => (
                      <button
                        key={law.id}
                        onClick={() => onSelect(law.id)}
                        className="bg-slate-800 hover:bg-slate-700 border border-emerald-800/50 hover:border-emerald-500/60 text-white rounded-xl p-3.5 text-left transition-all group active:scale-95"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs text-emerald-400">{law.addedAt}</span>
                        </div>
                        <span className="text-sm font-medium group-hover:text-emerald-300 transition-colors leading-snug">
                          {law.name}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* ヒーローセクション */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 pt-16 pb-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Scale className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white tracking-tight">Themisia</h1>
              <p className="text-amber-400/70 text-sm">テミシア</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-3">
            AIと公式データベースで、法律を深く理解する
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">
        {/* AI相談 */}
        <div className="mb-3 -mt-4 relative z-10">
          <HomeConsult />
        </div>

        {/* 検索バー */}
        <div className="mb-6 relative z-10">
          <LawSearch />
        </div>

        {/* 新着バッジ */}
        {autoLaws.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-emerald-400 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{autoLaws.length}件の法律が自動追加されています</span>
          </div>
        )}

        {/* ドメインカード */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LAW_DOMAINS.map((domain) => {
            const totalLaws = domain.categories.reduce((n, c) => n + c.laws.length, 0);
            const autoCount = autoLaws.filter((l) => l.domain === domain.id).length;
            const icon = DOMAIN_ICONS[domain.id] ?? "📚";

            return (
              <button
                key={domain.id}
                onClick={() => setSelectedDomain(domain)}
                className={`bg-gradient-to-br ${domain.color} border rounded-2xl p-4 text-left transition-all group active:scale-95 hover:shadow-lg`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">{domain.nameEn}</p>
                      <h3 className="text-lg font-bold text-white leading-tight">{domain.name}</h3>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors mt-1" />
                </div>
                <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">
                  {domain.description}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-black/20 text-slate-300 px-2 py-0.5 rounded-full">
                    {totalLaws}件
                  </span>
                  {autoCount > 0 && (
                    <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />+{autoCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
