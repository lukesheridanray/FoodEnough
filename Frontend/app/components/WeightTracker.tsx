"use client";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { WeightEntry } from "../hooks/useProfile";
import { formatDate } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";

interface ProjectionData {
  current_weight: number;
  weekly_rate: number;
  goal_weight_lbs: number | null;
  weeks_to_goal: number | null;
  moving_toward_goal: boolean | null;
  extended_projections: { week: number; projected_weight: number }[];
  calorie_deficit: number;
  data_points: number;
}

interface WeightTrackerProps {
  weightInput: string;
  setWeightInput: (v: string) => void;
  loggingWeight: boolean;
  weightError: string;
  weightSuccess: boolean;
  weightHistory: WeightEntry[];
  weightHistoryError: string;
  weightUnit: 'lbs' | 'kg';
  toggleWeightUnit: (unit: 'lbs' | 'kg') => void;
  displayWeight: (lbs: number) => string;
  unitLabel: string;
  loading: boolean;
  onLogWeight: (e: React.FormEvent) => void;
  goalWeight: string;
  setGoalWeight: (v: string) => void;
  savingGoalWeight: boolean;
  goalWeightError: string;
  goalWeightSuccess: boolean;
  onSaveGoalWeight: () => void;
  isPremium: boolean;
  profileGoalWeight: number | null;
}

export default function WeightTracker({
  weightInput,
  setWeightInput,
  loggingWeight,
  weightError,
  weightSuccess,
  weightHistory,
  weightHistoryError,
  weightUnit,
  toggleWeightUnit,
  displayWeight,
  unitLabel,
  loading,
  onLogWeight,
  goalWeight,
  setGoalWeight,
  savingGoalWeight,
  goalWeightError,
  goalWeightSuccess,
  onSaveGoalWeight,
  isPremium,
  profileGoalWeight,
}: WeightTrackerProps) {
  const [editingGoal, setEditingGoal] = useState(false);
  const [projections, setProjections] = useState<ProjectionData | null>(null);
  const [projectionsLoading, setProjectionsLoading] = useState(false);

  // Load projections when we have enough data and a goal weight
  useEffect(() => {
    if (!isPremium || weightHistory.length < 2) return;
    let cancelled = false;
    setProjectionsLoading(true);
    apiFetch("/analytics/projections")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled && data && data.current_weight) setProjections(data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProjectionsLoading(false); });
    return () => { cancelled = true; };
  }, [isPremium, weightHistory.length, profileGoalWeight]);

  // Build projection chart data combining historical + projected
  const buildProjectionChartData = () => {
    if (!projections || projections.extended_projections.length === 0) return null;

    const now = new Date();
    // Last 30 historical entries
    const recent = weightHistory.slice(-30);
    const historical = recent.map((e) => ({
      label: formatDate(e.timestamp, { weekday: undefined, month: "short", day: "numeric" }),
      historical: e.weight_lbs,
      projected: undefined as number | undefined,
    }));

    // Bridge: last historical point starts the projection
    const lastHistorical = recent[recent.length - 1];
    const bridgeLabel = formatDate(lastHistorical.timestamp, { weekday: undefined, month: "short", day: "numeric" });
    // Update bridge point to include both values
    if (historical.length > 0) {
      historical[historical.length - 1].projected = lastHistorical.weight_lbs;
    }

    // Projected points
    const projected = projections.extended_projections.map((p) => {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + p.week * 7);
      return {
        label: `Wk ${p.week}`,
        historical: undefined as number | undefined,
        projected: p.projected_weight,
      };
    });

    return [...historical, ...projected];
  };

  const projectionChartData = buildProjectionChartData();

  return (
    <>
      {/* Weight Logging */}
      <section className="px-5 mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-green-900">Log Weight</h2>
          <div className="flex rounded-lg border border-green-200 overflow-hidden text-sm">
            <button
              onClick={() => toggleWeightUnit('lbs')}
              className={`px-3 py-1 font-medium transition-colors ${
                weightUnit === 'lbs' ? 'bg-green-600 text-white' : 'text-green-700 hover:bg-green-50'
              }`}
            >
              lbs
            </button>
            <button
              onClick={() => toggleWeightUnit('kg')}
              className={`px-3 py-1 font-medium transition-colors ${
                weightUnit === 'kg' ? 'bg-green-600 text-white' : 'text-green-700 hover:bg-green-50'
              }`}
            >
              kg
            </button>
          </div>
        </div>
        <form onSubmit={onLogWeight} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex gap-2 items-center">
            <input
              type="number"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={`Weight in ${unitLabel}`}
              className="flex-1 border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loggingWeight || !weightInput}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loggingWeight ? "Saving\u2026" : "Log"}
            </button>
          </div>
          {weightError && <p className="text-red-500 text-sm mt-2">{weightError}</p>}
          {weightSuccess && <p className="text-green-600 text-sm mt-2 font-medium">Weight logged!</p>}
        </form>
      </section>

      {/* Goal Weight */}
      <section className="px-5 mt-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-green-900">Goal Weight</h3>
            {profileGoalWeight && !editingGoal && (
              <button
                onClick={() => setEditingGoal(true)}
                className="text-xs text-green-600 font-medium hover:text-green-800"
              >
                Edit
              </button>
            )}
          </div>
          {profileGoalWeight && !editingGoal ? (
            <p className="text-lg font-bold text-purple-700">
              {displayWeight(profileGoalWeight)} {unitLabel}
            </p>
          ) : (
            <div className="flex gap-2 items-center mt-1">
              <input
                type="number"
                step="0.1"
                value={goalWeight}
                onChange={(e) => setGoalWeight(e.target.value)}
                placeholder={`Goal in ${unitLabel}`}
                className="flex-1 border border-purple-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  onSaveGoalWeight();
                  setEditingGoal(false);
                }}
                disabled={savingGoalWeight || !goalWeight}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl shadow-md text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingGoalWeight ? "Saving\u2026" : "Set"}
              </button>
              {editingGoal && (
                <button
                  onClick={() => setEditingGoal(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
          {goalWeightError && <p className="text-red-500 text-xs mt-1">{goalWeightError}</p>}
          {goalWeightSuccess && <p className="text-green-600 text-xs mt-1 font-medium">Goal weight saved!</p>}
        </div>
      </section>

      {/* Weight History Chart */}
      {weightHistory.length > 0 && (
        <section className="px-5 mt-4">
          <h2 className="text-lg font-bold text-green-900 mb-2">Weight Over Time</h2>
          {weightHistory.length === 1 ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-sm font-semibold text-gray-700">
                {displayWeight(weightHistory[0].weight_lbs)} {unitLabel}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Log one more weight entry to see your trend.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(t) => formatDate(t, { weekday: undefined, month: "short", day: "numeric" })}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${displayWeight(v)} ${unitLabel}`}
                  />
                  <Tooltip
                    formatter={(v: any) => [`${displayWeight(v as number)} ${unitLabel}`, 'Weight']}
                    labelFormatter={(t) => formatDate(t)}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight_lbs"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent entries list */}
          <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Entries</h3>
            <ul className="space-y-1">
              {[...weightHistory].reverse().slice(0, 10).map((e) => (
                <li key={e.id} className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {formatDate(e.timestamp)}
                  </span>
                  <span className="font-semibold text-green-700">{displayWeight(e.weight_lbs)} {unitLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Weight Projection */}
      {isPremium && (
        <section className="px-5 mt-4">
          <h2 className="text-lg font-bold text-green-900 mb-2">Weight Projection</h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {weightHistory.length < 2 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Log weight for 2+ weeks to see projections.
              </p>
            ) : !profileGoalWeight ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Set a goal weight above to see your projection.
              </p>
            ) : projectionsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
              </div>
            ) : projectionChartData && projections ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={projectionChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${displayWeight(v)} ${unitLabel}`}
                    />
                    <Tooltip
                      formatter={(v: any, name: any) => [
                        `${displayWeight(v as number)} ${unitLabel}`,
                        name === "historical" ? "Actual" : "Projected",
                      ]}
                    />
                    {projections.goal_weight_lbs && (
                      <ReferenceLine
                        y={projections.goal_weight_lbs}
                        stroke="#ef4444"
                        strokeDasharray="6 4"
                        label={{
                          value: `Goal: ${displayWeight(projections.goal_weight_lbs)} ${unitLabel}`,
                          position: "insideTopRight",
                          fill: "#ef4444",
                          fontSize: 11,
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="historical"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls={false}
                      name="historical"
                    />
                    <Line
                      type="monotone"
                      dataKey="projected"
                      stroke="#9333ea"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      connectNulls={false}
                      name="projected"
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Summary text */}
                <div className="mt-3 text-center">
                  {projections.moving_toward_goal && projections.weeks_to_goal ? (
                    <p className="text-sm text-gray-700">
                      At your current rate (
                      <span className="font-semibold text-purple-700">
                        {projections.weekly_rate > 0 ? "+" : ""}{displayWeight(Math.abs(projections.weekly_rate * (weightUnit === 'kg' ? 1 : 1)))} {unitLabel}/wk
                      </span>
                      ), you&apos;ll reach{" "}
                      <span className="font-semibold text-purple-700">
                        {displayWeight(projections.goal_weight_lbs!)} {unitLabel}
                      </span>{" "}
                      in ~<span className="font-semibold">{Math.round(projections.weeks_to_goal)}</span> weeks
                    </p>
                  ) : projections.moving_toward_goal === false ? (
                    <div className="bg-amber-50 rounded-lg px-3 py-2">
                      <p className="text-sm text-amber-700 font-medium">
                        Your current trend is moving away from your goal.
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Rate: {projections.weekly_rate > 0 ? "+" : ""}{displayWeight(Math.abs(projections.weekly_rate))} {unitLabel}/wk
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Rate: {projections.weekly_rate > 0 ? "+" : ""}{displayWeight(Math.abs(projections.weekly_rate))} {unitLabel}/wk
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Not enough data for projections yet.
              </p>
            )}
          </div>
        </section>
      )}

      {weightHistoryError && (
        <section className="px-5 mt-4">
          <p className="text-red-500 text-sm">{weightHistoryError}</p>
        </section>
      )}

      {weightHistory.length === 0 && !loading && !weightHistoryError && (
        <section className="px-5 mt-4">
          <p className="text-gray-400 text-sm">No weight entries yet. Log your first one above.</p>
        </section>
      )}
    </>
  );
}
