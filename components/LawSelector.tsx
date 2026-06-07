"use client";

import { useState } from "react";
import { LAW_DOMAINS, LawDomain } from "@/lib/laws";
import { BookOpen, ArrowLeft, ChevronRight } from "lucide-react";

type Props = {
  onSelect: (lawId: string) => void;
};

export default function LawSelector({ onSelect }: Props) {
  const [selectedDomain, setSelectedDomain] = useState<LawDomain | null>(null);

  if (selectedDomain) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="w-10 h-10 text-amber-400" />
            <h1 className="text-4xl font-bold text-white">LexAI</h1>
          </div>
          <p className="text-slate-400">学びたい法分野を選んでください</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LAW_DOMAINS.map((domain) => {
            const totalLaws = domain.categories.reduce((n, c) => n + c.laws.length, 0);
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
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-black/20 text-slate-300 px-2 py-1 rounded-full">
                    {domain.categories.length} カテゴリ
                  </span>
                  <span className="text-xs bg-black/20 text-slate-300 px-2 py-1 rounded-full">
                    {totalLaws} 法律
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
