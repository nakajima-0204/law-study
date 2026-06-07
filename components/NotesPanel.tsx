"use client";

import { useState, useEffect } from "react";
import { getNotes, saveNote, deleteNote, addHistory, Note } from "@/lib/storage";
import { Plus, Trash2, Save, FileText } from "lucide-react";

type Props = {
  lawId: string;
  lawName: string;
};

export default function NotesPanel({ lawId, lawName }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // note id or "new"
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setNotes(getNotes(lawId));
  }, [lawId]);

  function startNew() {
    setEditing("new");
    setDraft("");
    addHistory({ lawId, lawName, type: "notes" });
  }

  function save() {
    if (!draft.trim()) return;
    if (editing === "new") {
      saveNote({ lawId, lawName, content: draft });
    } else if (editing) {
      saveNote({ id: editing, lawId, lawName, content: draft });
    }
    setNotes(getNotes(lawId));
    setEditing(null);
    setDraft("");
  }

  function startEdit(note: Note) {
    setEditing(note.id);
    setDraft(note.content);
  }

  function remove(id: string) {
    deleteNote(id);
    setNotes(getNotes(lawId));
    if (editing === id) { setEditing(null); setDraft(""); }
  }

  return (
    <div className="p-4 space-y-4">
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="条文・判例・気づきをメモ..."
            className="w-full h-56 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-amber-500 leading-relaxed"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium min-h-[44px]"
            >
              <Save className="w-4 h-4" /> 保存
            </button>
            <button
              onClick={() => { setEditing(null); setDraft(""); }}
              className="px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white bg-slate-800 min-h-[44px]"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startNew}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500 text-amber-400 px-4 py-3 rounded-xl text-sm font-medium w-full transition-all min-h-[48px]"
        >
          <Plus className="w-4 h-4" /> 新しいメモを追加
        </button>
      )}

      {notes.length === 0 && !editing && (
        <div className="text-center py-12 text-slate-500 text-sm">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
          まだメモがありません
        </div>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {new Date(note.updatedAt).toLocaleDateString("ja-JP")}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(note)}
                  className="text-slate-400 hover:text-amber-400 px-2 py-1 rounded text-xs"
                >
                  編集
                </button>
                <button
                  onClick={() => remove(note.id)}
                  className="text-slate-400 hover:text-red-400 p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {note.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
