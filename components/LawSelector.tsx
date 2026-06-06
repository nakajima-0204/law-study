"use client";

import { LAW_CATEGORIES } from "@/lib/laws";
import { BookOpen } from "lucide-react";

type Props = {
  onSelect: (lawId: string) => void;
};

export default function LawSelector({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="w-10 h-10 text-amber-400" />
            <h1 className="text-4xl font-bold text-white">LexAI</h1>
          </div>
          <p className="text-slate-400 text-lg">学びたい法律を選んでください</p>
        </div>

        <div className="grid gap-6">
          {LAW_CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <h2 className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3 px-1">
                {cat.name}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cat.laws.map((law) => (
                  <button
                    key={law.id}
                    onClick={() => onSelect(law.id)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500 text-white rounded-xl p-4 text-left transition-all group"
                  >
                    <span className="text-sm font-medium group-hover:text-amber-300 transition-colors">
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
