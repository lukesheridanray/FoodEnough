"use client";
import { useState } from "react";
import { Pencil, Loader2, ChevronDown, ChevronUp, ArrowRightLeft, Trash2, Check, X } from "lucide-react";
import { Log, LogEditFields } from "../hooks/useFoodLogs";
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
  onDirectEdit?: (logId: number, fields: LogEditFields) => Promise<boolean>;
  onDelete: (logId: number) => void;
  onExport: () => void;
  onMoveMeal?: (logId: number, mealType: string) => void;
}

const MEAL_ORDER = ["Breakfast", "Lunch", "Snack", "Dinner", "Other"];
const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"];

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

function EditForm({
  log,
  editLoading,
  editError,
  onSave,
  onCancel,
}: {
  log: Log;
  editLoading: boolean;
  editError: string;
  onSave: (fields: LogEditFields) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(log.input_text);
  const [calories, setCalories] = useState(String(log.calories));
  const [protein, setProtein] = useState(String(log.protein));
  const [carbs, setCarbs] = useState(String(log.carbs));
  const [fat, setFat] = useState(String(log.fat));
  const [mealType, setMealType] = useState(log.meal_type || "dinner");
  const [date, setDate] = useState(() => {
    const d = new Date(log.timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const handleSubmit = () => {
    const fields: LogEditFields = {};
    if (name !== log.input_text) fields.input_text = name;
    const cal = parseFloat(calories);
    if (!isNaN(cal) && cal !== log.calories) fields.calories = cal;
    const pro = parseFloat(protein);
    if (!isNaN(pro) && pro !== log.protein) fields.protein = pro;
    const crb = parseFloat(carbs);
    if (!isNaN(crb) && crb !== log.carbs) fields.carbs = crb;
    const ft = parseFloat(fat);
    if (!isNaN(ft) && ft !== log.fat) fields.fat = ft;
    if (mealType !== (log.meal_type || "")) fields.meal_type = mealType;

    const origDate = new Date(log.timestamp);
    const origDateStr = `${origDate.getFullYear()}-${String(origDate.getMonth() + 1).padStart(2, "0")}-${String(origDate.getDate()).padStart(2, "0")}`;
    if (date !== origDateStr) fields.date = date;

    if (Object.keys(fields).length === 0) { onCancel(); return; }
    onSave(fields);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Food</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] font-medium text-gray-400 block mb-0.5">Calories</label>
          <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-green-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-blue-400 block mb-0.5">Protein</label>
          <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-amber-400 block mb-0.5">Carbs</label>
          <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-amber-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-red-400 block mb-0.5">Fat</label>
          <input type="number" value={fat} onChange={(e) => setFat(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-red-500 focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-gray-400 block mb-0.5">Meal</label>
          <select value={mealType} onChange={(e) => setMealType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none capitalize">
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-400 block mb-0.5">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
        </div>
      </div>

      {editError && <p className="text-red-500 text-xs">{editError}</p>}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={editLoading}
          className="flex-1 py-2 text-xs rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={editLoading || !name.trim()}
          className="flex-1 py-2 text-xs rounded-xl bg-green-500 text-white hover:bg-green-600 disabled:opacity-60 flex items-center justify-center gap-1"
        >
          {editLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Saving&hellip;</> : <><Check className="w-3 h-3" /> Save</>}
        </button>
      </div>
    </div>
  );
}

function LogCard({
  log,
  deleteConfirmId,
  setDeleteConfirmId,
  editingId,
  setEditingId,
  editLoading,
  editError,
  setEditError,
  onDirectEdit,
  onDelete,
}: {
  log: Log;
  deleteConfirmId: number | null;
  setDeleteConfirmId: (id: number | null) => void;
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  editLoading: boolean;
  editError: string;
  setEditError: (err: string) => void;
  onDirectEdit?: (logId: number, fields: LogEditFields) => Promise<boolean>;
  onDelete: (logId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = (log.items?.length ?? 0) > 1;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {editingId === log.id && onDirectEdit ? (
        <EditForm
          log={log}
          editLoading={editLoading}
          editError={editError}
          onSave={(fields) => onDirectEdit(log.id, fields)}
          onCancel={() => { setEditingId(null); setEditError(""); }}
        />
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
                <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded-md font-medium">{log.fat}g F</span>
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
                {log.meal_type && (
                  <span className="ml-2 px-1.5 py-0.5 bg-green-50 text-green-600 rounded font-medium capitalize">{log.meal_type}</span>
                )}
              </div>
            </div>
            {deleteConfirmId !== log.id && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => { setEditingId(log.id); setDeleteConfirmId(null); }}
                  className="text-gray-400 hover:text-green-600 transition-colors p-2"
                  title="Edit"
                  aria-label="Edit log"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(log.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2"
                  title="Delete"
                  aria-label="Delete log"
                >
                  <Trash2 className="w-4 h-4" />
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
                      <span className="text-red-500">{item.fat}g F</span>
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
  editLoading,
  editError,
  setEditError,
  deleteError,
  exportError,
  onDirectEdit,
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
                    editLoading={editLoading}
                    editError={editError}
                    setEditError={setEditError}
                    onDirectEdit={onDirectEdit}
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
