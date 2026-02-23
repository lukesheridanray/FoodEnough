"use client";
import { useState } from "react";
import { Pencil, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Log } from "../hooks/useFoodLogs";
import { formatTime } from "../../lib/auth";

interface LogListProps {
  logs: Log[];
  deleteConfirmId: number | null;
  setDeleteConfirmId: (id: number | null) => void;
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  editText: string;
  setEditText: (text: string) => void;
  editLoading: boolean;
  editError: string;
  setEditError: (err: string) => void;
  deleteError?: string;
  exportError?: string;
  onEditSave: (logId: number) => void;
  onDelete: (logId: number) => void;
  onExport: () => void;
}

const MEAL_ORDER = ["Breakfast", "Lunch", "Snack", "Dinner", "Other"];

function groupByMealType(logs: Log[]): { label: string; logs: Log[] }[] {
  const hasMealTypes = logs.some((l) => l.meal_type);
  if (!hasMealTypes) return [{ label: "", logs }];

  const groups: Record<string, Log[]> = {};
  for (const log of logs) {
    const key = log.meal_type
      ? log.meal_type.charAt(0).toUpperCase() + log.meal_type.slice(1)
      : "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }

  return MEAL_ORDER
    .filter((label) => groups[label]?.length)
    .map((label) => ({ label, logs: groups[label] }));
}

function LogCard({
  log,
  deleteConfirmId,
  setDeleteConfirmId,
  editingId,
  setEditingId,
  editText,
  setEditText,
  editLoading,
  editError,
  setEditError,
  onEditSave,
  onDelete,
}: {
  log: Log;
  deleteConfirmId: number | null;
  setDeleteConfirmId: (id: number | null) => void;
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  editText: string;
  setEditText: (text: string) => void;
  editLoading: boolean;
  editError: string;
  setEditError: (err: string) => void;
  onEditSave: (logId: number) => void;
  onDelete: (logId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = (log.items?.length ?? 0) > 1;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {editingId === log.id ? (
        <div className="space-y-2">
          <input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            autoFocus
          />
          {editError && <p className="text-red-500 text-xs">{editError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setEditingId(null); setEditError(""); }}
              className="flex-1 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onEditSave(log.id)}
              disabled={editLoading || !editText.trim()}
              className="flex-1 py-1.5 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-60 flex items-center justify-center gap-1"
            >
              {editLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Saving{"\u2026"}</> : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-800 text-sm leading-snug">{log.input_text}</span>
                {hasItems && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-gray-400 hover:text-green-600 transition-colors flex-shrink-0 p-1.5"
                    aria-label={expanded ? "Collapse items" : "Expand items"}
                  >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-base font-bold text-green-700">{log.calories} kcal</span>
                <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">{log.protein}g P</span>
                <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md font-medium">{log.carbs}g C</span>
                <span className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-md font-medium">{log.fat}g F</span>
              </div>
              {(log.fiber != null || log.sugar != null || log.sodium != null) && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {log.fiber != null && (
                    <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-medium">{log.fiber}g Fiber</span>
                  )}
                  {log.sugar != null && (
                    <span className="text-xs px-1.5 py-0.5 bg-pink-50 text-pink-600 rounded-md font-medium">{log.sugar}g Sugar</span>
                  )}
                  {log.sodium != null && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium">{log.sodium}mg Na</span>
                  )}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(log.timestamp)}
              </div>
            </div>
            {deleteConfirmId !== log.id && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { setEditingId(log.id); setEditText(log.input_text); setDeleteConfirmId(null); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                  title="Edit"
                  aria-label="Edit log"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(log.id)}
                  className="text-red-400 hover:text-red-600 text-xl transition-colors p-2"
                  title="Delete"
                  aria-label="Delete log"
                >
                  {"\u00d7"}
                </button>
              </div>
            )}
          </div>

          {/* Expanded item breakdown */}
          {expanded && hasItems && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <ul className="space-y-1.5 pl-1">
                {log.items!.map((item, i) => (
                  <li key={i} className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 capitalize">{item.name}</span>
                    <span className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="font-semibold text-green-700">{item.calories} kcal</span>
                      <span className="text-blue-500">{item.protein}g P</span>
                      <span className="text-amber-500">{item.carbs}g C</span>
                      <span className="text-orange-500">{item.fat}g F</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {deleteConfirmId === log.id && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">Remove this entry?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onDelete(log.id)}
                  className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LogList({
  logs,
  deleteConfirmId,
  setDeleteConfirmId,
  editingId,
  setEditingId,
  editText,
  setEditText,
  editLoading,
  editError,
  setEditError,
  deleteError,
  exportError,
  onEditSave,
  onDelete,
  onExport,
}: LogListProps) {
  const groups = groupByMealType(logs);

  return (
    <section className="flex-1 px-5 mt-4 pb-24">
      {deleteError && (
        <p className="text-red-500 text-sm mb-2" role="alert">{deleteError}</p>
      )}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-green-900">My Logs</h2>
        <button
          onClick={onExport}
          aria-label="Export food logs as CSV"
          className="flex items-center gap-1 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-500 px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export CSV
        </button>
      </div>
      {exportError && (
        <p className="text-red-500 text-sm mb-2" role="alert">{exportError}</p>
      )}

      {logs.length === 0 ? (
        <div className="py-10 text-center">
          <div className="text-5xl mb-3">{"\ud83c\udf7d"}</div>
          <p className="text-gray-700 font-semibold">Nothing logged yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first meal above to start tracking</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label || "all"}>
              {group.label && (
                <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">{group.label}</h3>
              )}
              <div className="space-y-3">
                {group.logs.map((log) => (
                  <LogCard
                    key={log.id}
                    log={log}
                    deleteConfirmId={deleteConfirmId}
                    setDeleteConfirmId={setDeleteConfirmId}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    editText={editText}
                    setEditText={setEditText}
                    editLoading={editLoading}
                    editError={editError}
                    setEditError={setEditError}
                    onEditSave={onEditSave}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
