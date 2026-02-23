"use client";
import { useState } from "react";
import { Brain, TrendingUp, TrendingDown, Minus, Lightbulb, Trophy, AlertTriangle, Sparkles, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import type { ANITargets, RecalibrationRecord, Insight } from "../hooks/useANI";

interface ANIDashboardProps {
  targets: ANITargets | null;
  history: RecalibrationRecord[];
  insights: Insight[];
  recalibrating: boolean;
  recalError: string;
  onRecalibrate: () => void;
}

function DeltaBadge({ current, previous, unit }: { current: number; previous: number; unit: string }) {
  const delta = current - previous;
  if (delta === 0) return null;
  const positive = delta > 0;
  return (
    <span className={`text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
      {positive ? "+" : ""}{delta}{unit}
    </span>
  );
}

function insightIcon(type: string) {
  switch (type) {
    case "pattern": return <Lightbulb className="w-4 h-4 text-blue-500" />;
    case "achievement": return <Trophy className="w-4 h-4 text-green-500" />;
    case "warning": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "tip": return <Sparkles className="w-4 h-4 text-purple-500" />;
    default: return <Lightbulb className="w-4 h-4 text-gray-400" />;
  }
}

function insightBg(type: string) {
  switch (type) {
    case "pattern": return "bg-blue-50 border-blue-100";
    case "achievement": return "bg-green-50 border-green-100";
    case "warning": return "bg-amber-50 border-amber-100";
    case "tip": return "bg-purple-50 border-purple-100";
    default: return "bg-gray-50 border-gray-100";
  }
}

function daysAgo(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.endsWith("Z") ? "" : "Z"));
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

export default function ANIDashboard({ targets, history, insights, recalibrating, recalError, onRecalibrate }: ANIDashboardProps) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const latestRecal = history.length > 0 ? history[0] : null;

  // First-visit explainer
  if (!targets || !targets.ani_active) {
    return (
      <section className="px-5 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Your Goals, Adapting to You</h2>
          <div className="text-left space-y-3 mb-5">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">Analyzes your food logs and weight trends</p>
            </div>
            <div className="flex items-start gap-3">
              <RefreshCw className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">Adjusts calorie and macro targets weekly</p>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">Gets smarter the more you log</p>
            </div>
          </div>
          <button
            onClick={onRecalibrate}
            disabled={recalibrating}
            className="w-full py-2.5 px-4 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {recalibrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Run First Recalibration"
            )}
          </button>
          {recalError && <p className="text-red-500 text-sm mt-2">{recalError}</p>}
          <p className="text-xs text-gray-400 mt-3">Requires 7 days of food logging</p>
        </div>
      </section>
    );
  }

  const canRecalibrate = targets.days_until_next === 0;

  return (
    <div className="space-y-4">
      {/* Current Targets Card */}
      <section className="px-5">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-amber-900">ANI Targets</h2>
            </div>
            {targets.last_recalibrated && (
              <span className="text-xs text-gray-500">
                Updated {daysAgo(targets.last_recalibrated)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              {
                label: "Calories",
                value: `${targets.calorie_goal} kcal`,
                prev: latestRecal?.prev_goals.calorie_goal,
                current: targets.calorie_goal!,
                unit: " kcal",
                color: "text-amber-700",
              },
              {
                label: "Protein",
                value: `${targets.protein_goal}g`,
                prev: latestRecal?.prev_goals.protein_goal,
                current: targets.protein_goal!,
                unit: "g",
                color: "text-blue-600",
              },
              {
                label: "Carbs",
                value: `${targets.carbs_goal}g`,
                prev: latestRecal?.prev_goals.carbs_goal,
                current: targets.carbs_goal!,
                unit: "g",
                color: "text-amber-600",
              },
              {
                label: "Fat",
                value: `${targets.fat_goal}g`,
                prev: latestRecal?.prev_goals.fat_goal,
                current: targets.fat_goal!,
                unit: "g",
                color: "text-orange-600",
              },
            ].map((item) => (
              <div key={item.label} className="bg-white/70 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                {item.prev != null && (
                  <DeltaBadge current={item.current} previous={item.prev} unit={item.unit} />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={onRecalibrate}
            disabled={recalibrating || !canRecalibrate}
            className="w-full py-2.5 px-4 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {recalibrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Recalibrating...
              </>
            ) : canRecalibrate ? (
              "Recalibrate Now"
            ) : (
              `Next recalibration in ${targets.days_until_next} day${targets.days_until_next !== 1 ? "s" : ""}`
            )}
          </button>
          {recalError && <p className="text-red-500 text-sm mt-2">{recalError}</p>}
        </div>
      </section>

      {/* Recalibration Summary Card */}
      {latestRecal && (
        <section className="px-5">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-amber-900 mb-2">Latest Analysis</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{latestRecal.reasoning}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["calorie_goal", "protein_goal", "carbs_goal", "fat_goal"] as const).map((key) => {
                const labels: Record<string, string> = {
                  calorie_goal: "Calories",
                  protein_goal: "Protein",
                  carbs_goal: "Carbs",
                  fat_goal: "Fat",
                };
                const units: Record<string, string> = {
                  calorie_goal: " kcal",
                  protein_goal: "g",
                  carbs_goal: "g",
                  fat_goal: "g",
                };
                const prev = latestRecal.prev_goals[key];
                const next = latestRecal.new_goals[key];
                const delta = next - prev;
                const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
                const color = delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-gray-400";
                return (
                  <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <div>
                      <p className="text-xs text-gray-400">{labels[key]}</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {prev} &rarr; {next}{units[key]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Insight Feed */}
      {insights.length > 0 && (
        <section className="px-5">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-amber-900 mb-3">Insights</h2>
            <div className="space-y-2">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${insightBg(insight.type)}`}
                >
                  <div className="flex-shrink-0 mt-0.5">{insightIcon(insight.type)}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{insight.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* History Section */}
      {history.length > 1 && (
        <section className="px-5">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="flex items-center justify-between w-full"
            >
              <h2 className="text-base font-bold text-amber-900">Recalibration History</h2>
              {historyExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {historyExpanded && (
              <div className="mt-3 space-y-3">
                {history.slice(1).map((recal) => (
                  <div key={recal.id} className="border border-gray-100 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{daysAgo(recal.created_at)}</p>
                    <p className="text-sm text-gray-600">{recal.reasoning}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      <span>Cal: {recal.prev_goals.calorie_goal} &rarr; {recal.new_goals.calorie_goal}</span>
                      <span>Pro: {recal.prev_goals.protein_goal} &rarr; {recal.new_goals.protein_goal}g</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
