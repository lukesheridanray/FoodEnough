"use client";
import { useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import PremiumGate from "../components/PremiumGate";
import { useAnalytics } from "../hooks/useAnalytics";
import { exportToPDF } from "../../lib/pdfExport";
import { BarChart3, Flame, Download, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function AnalyticsPage() {
  const a = useAnalytics();
  const containerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [weekA, setWeekA] = useState(0);
  const [weekB, setWeekB] = useState(1);

  const handleExport = async () => {
    if (!containerRef.current) return;
    setExporting(true);
    try {
      await exportToPDF(containerRef.current, "foodenough-analytics.pdf");
    } catch {
      // ignore export errors
    } finally {
      setExporting(false);
    }
  };

  if (a.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 pb-24">
        <div style={{ height: "max(24px, env(safe-area-inset-top))" }} />
        <header className="px-5 py-3">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
        </header>
        <section className="px-5 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
            <div className="h-40 bg-gray-100 rounded-xl" />
          </div>
        </section>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 pb-24">
      <div style={{ height: "max(24px, env(safe-area-inset-top))" }} />

      <header className="px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-indigo-900">Analytics</h1>
            <p className="text-xs text-gray-500">Premium insights into your nutrition</p>
          </div>
        </div>
      </header>

      <PremiumGate isPremium={a.isPremium}>
        <div ref={containerRef} className="px-5 space-y-4">

          {/* 1. Consistency Score */}
          {a.consistency && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Consistency Score</h3>
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={a.consistency.score >= 70 ? "#22c55e" : a.consistency.score >= 40 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="8"
                      strokeDasharray={`${(a.consistency.score / 100) * 264} 264`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">{a.consistency.score}</span>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <div>
                    <p className="text-xs text-gray-500">Logging Rate</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${a.consistency.logging_rate}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600">{a.consistency.logging_rate}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Macro Accuracy</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${a.consistency.macro_accuracy}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600">{a.consistency.macro_accuracy}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{a.consistency.days_logged} of {a.consistency.days_total} days logged</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Streaks */}
          {a.streaks && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-gray-700">Streaks</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{a.streaks.current_streak}</p>
                  <p className="text-xs text-gray-500">Current</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{a.streaks.longest_streak}</p>
                  <p className="text-xs text-gray-500">Longest</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">{a.streaks.total_days_logged}</p>
                  <p className="text-xs text-gray-500">Total Days</p>
                </div>
              </div>
              {a.streaks.most_common_break_day && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Most common break day: <span className="font-medium text-gray-600">{a.streaks.most_common_break_day}</span>
                </p>
              )}
            </div>
          )}

          {/* 3. Trend Charts */}
          {a.trends.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Weekly Calorie Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={a.trends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg_calories" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Avg Calories" />
                </LineChart>
              </ResponsiveContainer>

              <h3 className="text-sm font-bold text-gray-700 mt-4 mb-3">Weekly Macro Averages</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={a.trends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="avg_protein" fill="#3b82f6" name="Protein" stackId="macros" />
                  <Bar dataKey="avg_carbs" fill="#f59e0b" name="Carbs" stackId="macros" />
                  <Bar dataKey="avg_fat" fill="#f97316" name="Fat" stackId="macros" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 4. Correlations */}
          {a.correlations && (a.correlations.workout_days.days > 0 || a.correlations.rest_days.days > 0) && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Workout vs Rest Day Nutrition</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-indigo-700 mb-1">Workout Days ({a.correlations.workout_days.days})</p>
                  <p className="text-lg font-bold text-indigo-800">{a.correlations.workout_days.calories} kcal</p>
                  <p className="text-xs text-indigo-600">{a.correlations.workout_days.protein}g P / {a.correlations.workout_days.carbs}g C / {a.correlations.workout_days.fat}g F</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Rest Days ({a.correlations.rest_days.days})</p>
                  <p className="text-lg font-bold text-gray-800">{a.correlations.rest_days.calories} kcal</p>
                  <p className="text-xs text-gray-600">{a.correlations.rest_days.protein}g P / {a.correlations.rest_days.carbs}g C / {a.correlations.rest_days.fat}g F</p>
                </div>
              </div>
              {a.correlations.insights.length > 0 && (
                <div className="mt-3 space-y-1">
                  {a.correlations.insights.map((insight, i) => (
                    <p key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{insight}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. Body Composition Projections */}
          {a.projections && a.projections.projections && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Weight Projections</h3>
              <p className="text-xs text-gray-500 mb-2">
                Current: {a.projections.current_weight} lbs | Rate: {a.projections.weekly_rate > 0 ? "+" : ""}{a.projections.weekly_rate} lbs/week
                {a.projections.avg_daily_expenditure && ` | Avg burn: ${a.projections.avg_daily_expenditure} kcal/day`}
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={[
                    { label: "Now", weight: a.projections.current_weight },
                    ...a.projections.projections.map((p) => ({
                      label: `${p.weeks}w`,
                      weight: p.projected_weight,
                    })),
                  ]}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Weight (lbs)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 6. Meal Timing */}
          {a.mealTiming.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Calorie Distribution by Meal</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  layout="vertical"
                  data={a.mealTiming}
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="meal_type" type="category" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [`${value}%`, "% of calories"]} />
                  <Bar dataKey="percentage" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 7. Comparative Week View */}
          {a.weekCompare && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Compare Weeks</h3>
              <div className="flex gap-2 mb-3">
                <select
                  value={weekA}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setWeekA(v);
                    a.reloadWeekCompare(v, weekB);
                  }}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? "This week" : i === 1 ? "Last week" : `${i} weeks ago`}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-400 self-center">vs</span>
                <select
                  value={weekB}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setWeekB(v);
                    a.reloadWeekCompare(weekA, v);
                  }}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? "This week" : i === 1 ? "Last week" : `${i} weeks ago`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { data: a.weekCompare.week_a, label: weekA === 0 ? "This week" : weekA === 1 ? "Last week" : `${weekA}w ago` },
                  { data: a.weekCompare.week_b, label: weekB === 0 ? "This week" : weekB === 1 ? "Last week" : `${weekB}w ago` },
                ].map(({ data, label }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">{label}</p>
                    <p className="text-lg font-bold text-gray-800">{data.avg_calories} <span className="text-xs font-normal text-gray-400">kcal/day</span></p>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-blue-600">{data.avg_protein}g protein</p>
                      <p className="text-xs text-amber-600">{data.avg_carbs}g carbs</p>
                      <p className="text-xs text-orange-600">{data.avg_fat}g fat</p>
                      <p className="text-xs text-gray-400 mt-1">{data.days_logged} days logged</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. PDF Export */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-2xl shadow-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
            ) : (
              <><Download className="w-4 h-4" /> Export Report as PDF</>
            )}
          </button>
        </div>
      </PremiumGate>

      <BottomNav />
    </div>
  );
}
