"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, formatDate } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";
import Link from "next/link";
import BottomNav from "../components/BottomNav";
import { Flame, Footprints, BarChart3, Heart } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface ParsedItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface LogEntry {
  input_text: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  items: ParsedItem[]; // from parsed_json.items
}

interface DailyGroup {
  date: string;
  isoDate: string; // "YYYY-MM-DD" for matching health metrics
  entries: LogEntry[];
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
}

interface WeekTotal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

interface HealthMetricDay {
  date: string;
  total_expenditure: number | null;
  active_calories: number | null;
  steps: number | null;
}

interface BurnLogEntry {
  id: number;
  timestamp: string;
  workout_type: string;
  duration_minutes: number | null;
  calories_burned: number;
  avg_heart_rate: number | null;
  source: string;
}

const WORKOUT_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  running: { label: "Running", emoji: "\ud83c\udfc3" },
  weight_training: { label: "Weights", emoji: "\ud83c\udfcb\ufe0f" },
  cycling: { label: "Cycling", emoji: "\ud83d\udeb4" },
  swimming: { label: "Swimming", emoji: "\ud83c\udfca" },
  walking: { label: "Walking", emoji: "\ud83d\udeb6" },
  hiit: { label: "HIIT", emoji: "\u26a1" },
  yoga: { label: "Yoga", emoji: "\ud83e\uddd8" },
  other: { label: "Other", emoji: "\ud83d\udcaa" },
};

export default function DiaryPage() {
  const [dailyLogs, setDailyLogs] = useState<DailyGroup[]>([]);
  const [weekTotal, setWeekTotal] = useState<WeekTotal>({
    calories: 0, protein: 0, carbs: 0, fat: 0,
    fiber: 0, sugar: 0, sodium: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});
  const [healthMetrics, setHealthMetrics] = useState<Record<string, HealthMetricDay>>({});
  const [burnLogsByDate, setBurnLogsByDate] = useState<Record<string, BurnLogEntry[]>>({});
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/logs/week?offset_days=${weekOffset * 7}`);

        if (!res.ok) {
          setError("Failed to load diary. Please try again.");
          return;
        }

        const data = await res.json();
        const grouped: Record<string, LogEntry[]> = {};
        const isoDateMap: Record<string, string> = {}; // displayDate -> isoDate
        const totals: WeekTotal = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

        for (const log of data.logs) {
          const date = formatDate(log.timestamp);
          if (!grouped[date]) grouped[date] = [];
          // Track the ISO date (YYYY-MM-DD) from timestamp
          if (!isoDateMap[date]) {
            const ts = log.timestamp.endsWith("Z") ? log.timestamp : log.timestamp + "Z";
            isoDateMap[date] = new Date(ts).toISOString().slice(0, 10);
          }

          const parsed =
            typeof log.parsed_json === "string"
              ? (() => { try { return JSON.parse(log.parsed_json); } catch { return null; } })()
              : log.parsed_json;

          const entry: LogEntry = {
            input_text: log.input_text,
            calories: log.calories ?? 0,
            protein: log.protein ?? 0,
            carbs: log.carbs ?? 0,
            fat: log.fat ?? 0,
            fiber: log.fiber ?? null,
            sugar: log.sugar ?? null,
            sodium: log.sodium ?? null,
            items: parsed?.items ?? [],
          };

          grouped[date].push(entry);

          totals.calories += entry.calories;
          totals.protein  += entry.protein;
          totals.carbs    += entry.carbs;
          totals.fat      += entry.fat;
          totals.fiber    += entry.fiber ?? 0;
          totals.sugar    += entry.sugar ?? 0;
          totals.sodium   += entry.sodium ?? 0;
        }

        const output: DailyGroup[] = Object.entries(grouped).map(([date, entries]) => {
          const total = entries.reduce(
            (sum, e) => ({
              calories: sum.calories + e.calories,
              protein:  sum.protein  + e.protein,
              carbs:    sum.carbs    + e.carbs,
              fat:      sum.fat      + e.fat,
              fiber:    sum.fiber    + (e.fiber ?? 0),
              sugar:    sum.sugar    + (e.sugar ?? 0),
              sodium:   sum.sodium   + (e.sodium ?? 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
          );
          return { date, isoDate: isoDateMap[date] || "", entries, total };
        });

        setDailyLogs(output);
        setWeekTotal(totals);

        // Fetch health metrics and burn logs for same week
        try {
          const [healthRes, burnRes] = await Promise.all([
            apiFetch(`/health/week?offset_days=${weekOffset * 7}`),
            apiFetch(`/burn-logs/week?offset_days=${weekOffset * 7}`),
          ]);
          if (healthRes.ok) {
            const healthData = await healthRes.json();
            const metricsMap: Record<string, HealthMetricDay> = {};
            for (const m of healthData.metrics || []) {
              if (m.total_expenditure != null || m.active_calories != null || m.steps != null) {
                metricsMap[m.date] = m;
              }
            }
            setHealthMetrics(metricsMap);
          }
          if (burnRes.ok) {
            const burnData = await burnRes.json();
            const burnMap: Record<string, BurnLogEntry[]> = {};
            for (const bl of burnData.burn_logs || []) {
              const ts = bl.timestamp.endsWith("Z") ? bl.timestamp : bl.timestamp + "Z";
              const dateKey = new Date(ts).toISOString().slice(0, 10);
              if (!burnMap[dateKey]) burnMap[dateKey] = [];
              burnMap[dateKey].push(bl);
            }
            setBurnLogsByDate(burnMap);
          }
        } catch {
          // non-critical, ignore
        }
      } catch (err) {
        if (err instanceof UnauthorizedError) { router.push("/login"); return; }
        setError("Failed to load diary. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [weekOffset]);

  const getWeekLabel = () => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() - weekOffset * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const toggleEntry = (key: string) =>
    setExpandedEntries(prev => ({ ...prev, [key]: !prev[key] }));

  const hasFiberData  = weekTotal.fiber  > 0;
  const hasSugarData  = weekTotal.sugar  > 0;
  const hasSodiumData = weekTotal.sodium > 0;

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex items-center justify-center">
      <p aria-live="polite" className="text-gray-500">Loading…</p>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex items-center justify-center">
      <p role="alert" className="text-red-500">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
      <div className="px-5 max-w-2xl mx-auto pb-28">

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            aria-label="Previous week"
            onClick={() => { setWeekOffset(w => w + 1); setLoading(true); }}
            className="p-2 rounded-xl bg-white shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >←</button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-green-900">
              {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Last Week' : `${weekOffset} Weeks Ago`}
            </h2>
            <p className="text-sm text-gray-500">{getWeekLabel()}</p>
          </div>
          <button
            aria-label="Next week"
            onClick={() => { setWeekOffset(w => Math.max(0, w - 1)); setLoading(true); }}
            disabled={weekOffset === 0}
            className="p-2 rounded-xl bg-white shadow-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30"
          >→</button>
        </div>

        {/* Premium Analytics link */}
        <Link
          href="/analytics"
          className="block bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-900">Premium Analytics</p>
              <p className="text-xs text-indigo-600">Trends, streaks, projections & more</p>
            </div>
          </div>
        </Link>

        {/* Empty state */}
        {dailyLogs.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">📅</div>
            <p className="text-gray-700 font-semibold">No entries this week</p>
            <p className="text-gray-400 text-sm mt-1">Log meals on the home screen to see them here</p>
          </div>
        )}

        {/* Daily cards */}
        {dailyLogs.map((group) => (
          <div key={group.date} className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 mb-3">{group.date}</p>

            <div className="space-y-3">
              {group.entries.map((entry, idx) => {
                const entryKey = `${group.date}-${idx}`;
                const expanded = expandedEntries[entryKey];
                const hasExtended = entry.fiber != null || entry.sugar != null || entry.sodium != null;
                const hasItems = entry.items.length > 1;

                return (
                  <div key={entryKey} className="border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800 leading-snug flex-1">{entry.input_text}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-green-700">{entry.calories} kcal</span>
                        {hasItems && (
                          <button
                            onClick={() => toggleEntry(entryKey)}
                            className="text-xs text-gray-400 hover:text-green-600"
                          >
                            {expanded ? "▲" : "▼"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Macro badges */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">{entry.protein}g P</span>
                      <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md font-medium">{entry.carbs}g C</span>
                      <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded-md font-medium">{entry.fat}g F</span>
                      {hasExtended && <>
                        {entry.fiber  != null && <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-medium">{entry.fiber}g fiber</span>}
                        {entry.sugar  != null && <span className="text-xs px-1.5 py-0.5 bg-pink-50 text-pink-600 rounded-md font-medium">{entry.sugar}g sugar</span>}
                        {entry.sodium != null && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium">{entry.sodium}mg Na</span>}
                      </>}
                    </div>

                    {/* Expanded item breakdown */}
                    {expanded && hasItems && (
                      <ul className="mt-2 pl-2 space-y-1 border-l-2 border-green-100">
                        {entry.items.map((item, i) => (
                          <li key={i} className="flex justify-between text-xs text-gray-500">
                            <span className="capitalize">{item.name}</span>
                            <span className="ml-2 flex-shrink-0">
                              {item.calories} kcal ·{" "}
                              <span className="text-blue-400">{item.protein}g P</span> ·{" "}
                              <span className="text-amber-400">{item.carbs}g C</span> ·{" "}
                              <span className="text-red-400">{item.fat}g F</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Daily total */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Day Total</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-bold text-green-700">{group.total.calories} kcal</span>
                <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-semibold">{Math.round(group.total.protein)}g P</span>
                <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md font-semibold">{Math.round(group.total.carbs)}g C</span>
                <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded-md font-semibold">{Math.round(group.total.fat)}g F</span>
                {group.total.fiber  > 0 && <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-semibold">{Math.round(group.total.fiber)}g fiber</span>}
                {group.total.sugar  > 0 && <span className="text-xs px-1.5 py-0.5 bg-pink-50 text-pink-600 rounded-md font-semibold">{Math.round(group.total.sugar)}g sugar</span>}
                {group.total.sodium > 0 && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md font-semibold">{Math.round(group.total.sodium)}mg Na</span>}
              </div>
              {/* Burn log entries for this day */}
              {burnLogsByDate[group.isoDate] && burnLogsByDate[group.isoDate].length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Activity</p>
                  <div className="space-y-1.5">
                    {burnLogsByDate[group.isoDate].map((bl) => {
                      const typeInfo = WORKOUT_TYPE_LABELS[bl.workout_type] || WORKOUT_TYPE_LABELS.other;
                      return (
                        <div key={bl.id} className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{typeInfo.emoji}</span>
                          <span className="font-medium">{typeInfo.label}</span>
                          <span className="text-orange-600 font-semibold">{Math.round(bl.calories_burned)} kcal</span>
                          {bl.duration_minutes != null && <span className="text-gray-400">{bl.duration_minutes} min</span>}
                          {bl.avg_heart_rate != null && (
                            <span className="flex items-center gap-0.5 text-gray-400">
                              <Heart className="w-3 h-3 text-red-400" />
                              {bl.avg_heart_rate}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Device activity data for this day */}
              {healthMetrics[group.isoDate] && (
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {healthMetrics[group.isoDate].total_expenditure != null && (
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      Total burn: {healthMetrics[group.isoDate].total_expenditure} kcal
                    </span>
                  )}
                  {healthMetrics[group.isoDate].steps != null && (
                    <span className="flex items-center gap-1">
                      <Footprints className="w-3 h-3 text-blue-400" />
                      {healthMetrics[group.isoDate].steps!.toLocaleString()} steps
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {dailyLogs.length > 0 && (<>

          {/* Weekly calorie chart */}
          <h3 className="text-lg font-bold text-green-900 mt-8 mb-3">Weekly Calories</h3>
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={dailyLogs.map((g) => ({ date: g.date, calories: g.total.calories }))}
                margin={{ top: 24, right: 16, left: 0, bottom: 5 }}
              >
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value ?? 0} kcal`, "Calories"]} />
                <Bar dataKey="calories" fill="#16a34a" radius={[4, 4, 0, 0] as [number, number, number, number]}>
                  <LabelList dataKey="calories" position="top" style={{ fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly nutrient summary */}
          <h3 className="text-lg font-bold text-green-900 mb-3">Weekly Nutrients</h3>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Nutrient</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Weekly Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Daily Avg</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Calories", value: weekTotal.calories, unit: "kcal", dot: "bg-green-500",   text: "text-green-700",   always: true  },
                  { label: "Protein",  value: weekTotal.protein,  unit: "g",    dot: "bg-blue-500",    text: "text-blue-600",   always: true  },
                  { label: "Carbs",    value: weekTotal.carbs,    unit: "g",    dot: "bg-amber-500",   text: "text-amber-600",  always: true  },
                  { label: "Fat",      value: weekTotal.fat,      unit: "g",    dot: "bg-red-500",  text: "text-red-600", always: true  },
                  { label: "Fiber",    value: weekTotal.fiber,    unit: "g",    dot: "bg-emerald-500", text: "text-emerald-600", always: hasFiberData  },
                  { label: "Sugar",    value: weekTotal.sugar,    unit: "g",    dot: "bg-pink-400",    text: "text-pink-600",   always: hasSugarData  },
                  { label: "Sodium",   value: weekTotal.sodium,   unit: "mg",   dot: "bg-gray-400",    text: "text-gray-600",   always: hasSodiumData },
                ].filter(r => r.always).map((row, i, arr) => (
                  <tr key={row.label} className={i < arr.length - 1 ? "border-b" : ""}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${row.dot} flex-shrink-0`} />
                        <span className="text-gray-800">{row.label}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${row.text}`}>
                      {Math.round(row.value)}{row.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {Math.round(row.value / Math.max(1, dailyLogs.length))}{row.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>)}

        <BottomNav />
      </div>
    </div>
  );
}
