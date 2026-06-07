"use client";

import { useState } from "react";
import { LAW_DOMAINS, LawDomain, AutoLaw } from "@/lib/laws";
import autoLawsData from "@/data/auto-laws.json";
import { BookOpen, ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import LawSearch from "@/components/LawSearch";

const autoLaws = autoLawsData as AutoLaw[];

type Props = {
  onSelect: (lawId: string) => void;
};

export default function LawSelector({ onSelect }: Props) {
  const [selectedDomain, setSelectedDomain] = useState<LawDomain | null>(null);

  if (selectedDomain) {
    // この domain に属する自動追加法律
    const domainAutoLaws = autoLaws.filter((l) => l.domain === selectedDomain.id);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedDomain(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">大分類に戻る</span>
          </button>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">{selectedDomain.name}</h2>
            <p className="text-slate-400 text-sm mt-1">{selectedDomain.description}</p>
          </div>

          <div className="space-y-6">
            {selectedDomain.categories.map((cat) => (
              <div key={cat.id}>
                <h3 className="text-amber-400 font-semibold text-xs uppercase tracking-widest mb-3 px-1">
                  {cat.name}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {cat.laws.map((law) => (
                    <button
                      key={law.id}
                      onClick={() => onSelect(law.id)}
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500 text-white rounded-xl p-3.5 text-left transition-all group flex items-start justify-between gap-2"
                    >
                      <span className="text-sm font-medium group-hover:text-amber-300 transition-colors leading-snug">
                        {law.name}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 flex-shrink-0 mt-0.5 transition-colors" />
                    </button>
                  ))}

                  {/* この category に属する自動追加法律 */}
                  {domainAutoLaws
                    .filter((l) => l.category === cat.id)
                    .map((law) => (
                      <button
                        key={law.id}
                        onClick={() => onSelect(law.id)}
                        className="bg-slate-800 hover:bg-slate-700 border border-emerald-800/50 hover:border-emerald-500 text-white rounded-xl p-3.5 text-left transition-all group flex items-start justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            <span className="text-xs text-emerald-400">{law.addedAt} 追加</span>
                          </div>
                          <span className="text-sm font-medium group-hover:text-emerald-300 transition-colors leading-snug">
                            {law.name}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 flex-shrink-0 mt-4 transition-colors" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 pb-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 pt-10">
          <LawSearch />
        </div>

        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="w-10 h-10 text-amber-400" />
            <h1 className="text-4xl font-bold text-white">Themisia</h1>
            <p className="text-amber-400/60 text-sm -mt-1">テミシア</p>
          </div>
          <p className="text-slate-400">学びたい法分野を選んでください</p>
          {autoLaws.length > 0 && (
            <p className="text-emerald-400 text-xs mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              {autoLaws.length}件の法律が自動追加されています
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LAW_DOMAINS.map((domain) => {
            const totalLaws = domain.categories.reduce((n, c) => n + c.laws.length, 0);
            const autoCount = autoLaws.filter((l) => l.domain === domain.id).length;
            return (
              <button
                key={domain.id}
                onClick={() => setSelectedDomain(domain)}
                className={`bg-gradient-to-br ${domain.color} border rounded-2xl p-5 text-left transition-all group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs text-slate-400 font-medium tracking-wider">
                      {domain.nameEn}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">{domain.name}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors mt-1" />
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-3">
                  {domain.description}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-black/20 text-slate-300 px-2 py-1 rounded-full">
                    {domain.categories.length} カテゴリ
                  </span>
                  <span className="text-xs bg-black/20 text-slate-300 px-2 py-1 rounded-full">
                    {totalLaws} 法律
                  </span>
                  {autoCount > 0 && (
                    <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      +{autoCount} 新着
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
