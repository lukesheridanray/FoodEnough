"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  Trophy,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Scale,
  Flame,
  Activity,
  CheckCircle,
  Info,
  Target,
} from "lucide-react";
import type { ANITargets, RecalibrationRecord, Insight } from "../hooks/useANI";

interface ANIDashboardProps {
  targets: ANITargets | null;
  history: RecalibrationRecord[];
  insights: Insight[];
  recalibrating: boolean;
  recalError: string;
  onRecalibrate: () => void;
}

/* ─── Helpers (preserved) ─── */

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

/* ─── Weight trend signal display config ─── */

type WeightTrendSignal = NonNullable<ANITargets["weight_trend_signal"]>;

interface SignalDisplay {
  icon: React.ReactNode;
  message: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  textColor: string;
}

function getSignalDisplay(signal: WeightTrendSignal): SignalDisplay {
  switch (signal) {
    case "on_track":
      return {
        icon: <CheckCircle className="w-6 h-6 text-green-600" />,
        message: "Your weight is moving in the right direction",
        gradientFrom: "from-green-50",
        gradientTo: "to-emerald-50",
        borderColor: "border-green-200",
        textColor: "text-green-800",
      };
    case "too_fast":
      return {
        icon: <Info className="w-6 h-6 text-amber-600" />,
        message: "Losing a bit quickly \u2014 ANI adjusted to protect your progress",
        gradientFrom: "from-amber-50",
        gradientTo: "to-yellow-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-800",
      };
    case "too_slow":
      return {
        icon: <Info className="w-6 h-6 text-amber-600" />,
        message: "Progress is slower than expected \u2014 ANI is fine-tuning",
        gradientFrom: "from-amber-50",
        gradientTo: "to-yellow-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-800",
      };
    case "wrong_direction":
      return {
        icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
        message: "Weight trend doesn\u2019t match your goal \u2014 ANI is adjusting",
        gradientFrom: "from-amber-50",
        gradientTo: "to-orange-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-800",
      };
    case "no_data":
    default:
      return {
        icon: <Scale className="w-6 h-6 text-gray-400" />,
        message: "Log your weight to unlock smarter adjustments",
        gradientFrom: "from-gray-50",
        gradientTo: "to-gray-100",
        borderColor: "border-gray-200",
        textColor: "text-gray-600",
      };
  }
}

function signalUsedLabel(signal: ANITargets["signal_used"]): string | null {
  if (signal === "weight_7d") return "7-day";
  if (signal === "weight_30d") return "30-day";
  if (signal === "weight_60d") return "60-day";
  if (signal === "weight_90d") return "90-day";
  if (signal === "multi_window") return "Blended";
  return null;
}

/* ─── Main component ─── */

export default function ANIDashboard({ targets, history, insights, recalibrating, recalError, onRecalibrate }: ANIDashboardProps) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const latestRecal = history.length > 0 ? history[0] : null;

  // First-visit explainer (unchanged)
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
          <Link href="/ani/how-it-works" className="block text-sm text-amber-600 font-medium mt-4 hover:underline">
            Learn how ANI works &rarr;
          </Link>
        </div>
      </section>
    );
  }

  const canRecalibrate = targets.days_until_next === 0;
  const weightSignal = targets.weight_trend_signal ?? "no_data";
  const signalDisplay = getSignalDisplay(weightSignal);
  const signalBadge = signalUsedLabel(targets.signal_used ?? null);

  return (
    <div className="space-y-4">

      {/* ─── How it works link ─── */}
      <div className="px-5">
        <Link href="/ani/how-it-works" className="text-xs text-amber-600 font-medium hover:underline">
          How does this work? &rarr;
        </Link>
      </div>

      {/* ─── 1. Weight Trend Signal Card (PRIMARY) ─── */}
      <section className="px-5">
        <div className={`bg-gradient-to-br ${signalDisplay.gradientFrom} ${signalDisplay.gradientTo} border ${signalDisplay.borderColor} rounded-2xl shadow-sm p-5`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{signalDisplay.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-gray-900">Weight Trend</h2>
                {signalBadge && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-white/80 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                    {signalBadge}
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 leading-relaxed ${signalDisplay.textColor}`}>
                {signalDisplay.message}
              </p>
              {targets.weight_delta != null && targets.weight_delta !== 0 && (
                <p className="text-sm font-semibold text-gray-800 mt-2">
                  {targets.weight_delta > 0 ? "+" : ""}
                  {targets.weight_delta.toFixed(1)} lbs/week
                  {targets.signal_used === "multi_window" ? " (blended)" :
                   targets.signal_used === "weight_30d" ? " (30-day)" :
                   targets.signal_used === "weight_60d" ? " (60-day)" :
                   targets.signal_used === "weight_90d" ? " (90-day)" :
                   targets.signal_used === "weight_7d" ? " (7-day)" : ""}
                </p>
              )}
              {/* Per-window breakdown */}
              {targets.trend_windows && targets.windows_used && targets.windows_used.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {(["7d", "30d", "60d", "90d"] as const).map((key) => {
                    const w = targets.trend_windows?.[key];
                    if (!w) return null;
                    const used = targets.windows_used?.includes(key);
                    return (
                      <span
                        key={key}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                          used ? "bg-amber-100 text-amber-700 font-semibold" : "bg-gray-100 text-gray-400 line-through"
                        }`}
                      >
                        {key}: {w.delta > 0 ? "+" : ""}{w.delta.toFixed(1)}
                        {w.noisy ? " ~" : ""}
                        {used ? ` (${Math.round(w.weight * 100)}%)` : ""}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Energy Balance Card (SECONDARY) ─── */}
      {(targets.avg_calories != null || targets.calories_out != null) && (
        <section className="px-5">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-gray-900">Energy Balance</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">How your eating compares to what your body burns.</p>

            {/* Two-column: Calories In / Calories Out */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-0.5">Calories In</p>
                <p className="text-lg font-bold text-amber-700">
                  {targets.avg_calories != null ? Math.round(targets.avg_calories) : "\u2014"}
                </p>
                <p className="text-[10px] text-gray-400">avg / day</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-0.5">Calories Out</p>
                <p className="text-lg font-bold text-orange-600">
                  {targets.calories_out != null ? Math.round(targets.calories_out) : "\u2014"}
                </p>
                <p className="text-[10px] text-gray-400">daily burn + exercise</p>
              </div>
            </div>

            {/* Net balance */}
            {targets.net_balance != null && (
              <div className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 mb-3 ${
                targets.net_balance < 0 ? "bg-green-50" : targets.net_balance > 0 ? "bg-red-50" : "bg-gray-50"
              }`}>
                {targets.net_balance < 0 ? (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                ) : targets.net_balance > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
                <span className={`text-sm font-semibold ${
                  targets.net_balance < 0 ? "text-green-700" : targets.net_balance > 0 ? "text-red-600" : "text-gray-500"
                }`}>
                  {targets.net_balance > 0 ? "+" : ""}{Math.round(targets.net_balance)} kcal/day net
                </span>
              </div>
            )}

            {/* NEAT estimate */}
            {targets.neat_estimate != null && (
              <p className="text-xs text-gray-400 mb-2">
                <Flame className="w-3 h-3 inline-block mr-1 text-orange-400 relative -top-[1px]" />
                Estimated daily burn (before workouts): {Math.round(targets.neat_estimate)} kcal
              </p>
            )}

            {/* Energy balance agreement */}
            {targets.energy_balance_agrees === true && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl py-2 px-3">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-xs text-green-700">Your logging and weight trend agree</p>
              </div>
            )}
            {targets.energy_balance_agrees === false && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl py-2 px-3">
                <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">Your logged intake and weight trend don&rsquo;t quite match &mdash; that&rsquo;s normal. ANI uses the scale as the final word.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── 3. ANI Targets Card ─── */}
      <section className="px-5">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-amber-900">ANI Targets</h2>
            </div>
            {targets.last_recalibrated && (
              <span className="text-xs text-gray-500">
                Updated {daysAgo(targets.last_recalibrated)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">
            These are your current targets. Being close is good enough &mdash; it&rsquo;s the trend that matters.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              {
                label: "Calories",
                value: `${targets.calorie_goal ?? 0} kcal`,
                prev: latestRecal?.prev_goals.calorie_goal,
                current: targets.calorie_goal ?? 0,
                unit: " kcal",
                color: "text-amber-700",
              },
              {
                label: "Protein",
                value: `${targets.protein_goal ?? 0}g`,
                prev: latestRecal?.prev_goals.protein_goal,
                current: targets.protein_goal ?? 0,
                unit: "g",
                color: "text-blue-600",
              },
              {
                label: "Carbs",
                value: `${targets.carbs_goal ?? 0}g`,
                prev: latestRecal?.prev_goals.carbs_goal,
                current: targets.carbs_goal ?? 0,
                unit: "g",
                color: "text-amber-600",
              },
              {
                label: "Fat",
                value: `${targets.fat_goal ?? 0}g`,
                prev: latestRecal?.prev_goals.fat_goal,
                current: targets.fat_goal ?? 0,
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

      {/* ─── 4. How ANI Made This Call ─── */}
      {latestRecal && (
        <section className="px-5">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-amber-900">How ANI Made This Call</h2>
            </div>
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

      {/* ─── 5. Insight Feed ─── */}
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

      {/* ─── 6. History Section ─── */}
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
                    {recal.analysis?.signal_used && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Signal: {
                          recal.analysis.signal_used === "weight_7d" ? "7-day weight" :
                          recal.analysis.signal_used === "weight_30d" ? "30-day weight" :
                          recal.analysis.signal_used === "weight_60d" ? "60-day weight" :
                          recal.analysis.signal_used === "weight_90d" ? "90-day weight" :
                          recal.analysis.signal_used === "multi_window" ? "blended weight" :
                          "calories only"
                        }
                        {recal.analysis.weight_delta != null && ` | \u0394 ${recal.analysis.weight_delta > 0 ? "+" : ""}${recal.analysis.weight_delta.toFixed(1)} lbs`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── 7. Philosophy Footer ─── */}
      <section className="px-5 pb-2">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          ANI isn&rsquo;t about hitting exact numbers. It&rsquo;s about whether your weight is
          moving in the right direction at the right pace. Being close is good enough when the
          scale agrees.
        </p>
      </section>
    </div>
  );
}
