"use client";

export type HistoryEntry = {
  id: string;
  lawId: string;
  lawName: string;
  date: string;
  type: "chat" | "quiz" | "cases" | "articles" | "notes";
};

export type QuizScore = {
  correct: number;
  total: number;
  lastStudied: string;
};

export type Note = {
  id: string;
  lawId: string;
  lawName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type FontSize = "sm" | "md" | "lg";

const KEYS = {
  history: "lexai_history",
  scores: "lexai_quiz_scores",
  notes: "lexai_notes",
  fontSize: "lexai_font_size",
} as const;

function get<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// 履歴
export function addHistory(entry: Omit<HistoryEntry, "id" | "date">) {
  const history = get<HistoryEntry[]>(KEYS.history, []);
  history.unshift({ ...entry, id: Date.now().toString(), date: new Date().toISOString() });
  set(KEYS.history, history.slice(0, 200));
}

export function getHistory(): HistoryEntry[] {
  return get<HistoryEntry[]>(KEYS.history, []);
}

// クイズスコア
export function saveQuizScore(lawId: string, correct: number, total: number) {
  const scores = get<Record<string, QuizScore>>(KEYS.scores, {});
  const prev = scores[lawId] ?? { correct: 0, total: 0, lastStudied: "" };
  scores[lawId] = {
    correct: prev.correct + correct,
    total: prev.total + total,
    lastStudied: new Date().toISOString(),
  };
  set(KEYS.scores, scores);
}

export function getQuizScores(): Record<string, QuizScore> {
  return get<Record<string, QuizScore>>(KEYS.scores, {});
}

// ノート
export function getNotes(lawId?: string): Note[] {
  const notes = get<Note[]>(KEYS.notes, []);
  return lawId ? notes.filter((n) => n.lawId === lawId) : notes;
}

export function saveNote(note: Omit<Note, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const notes = get<Note[]>(KEYS.notes, []);
  const now = new Date().toISOString();
  if (note.id) {
    const idx = notes.findIndex((n) => n.id === note.id);
    if (idx !== -1) notes[idx] = { ...notes[idx], ...note, updatedAt: now };
  } else {
    notes.unshift({ ...note, id: Date.now().toString(), createdAt: now, updatedAt: now });
  }
  set(KEYS.notes, notes);
}

export function deleteNote(id: string) {
  const notes = get<Note[]>(KEYS.notes, []).filter((n) => n.id !== id);
  set(KEYS.notes, notes);
}

// フォントサイズ
export function getFontSize(): FontSize {
  return get<FontSize>(KEYS.fontSize, "md");
}

export function setFontSize(size: FontSize) {
  set(KEYS.fontSize, size);
}

export const FONT_SIZE_CLASS: Record<FontSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};
