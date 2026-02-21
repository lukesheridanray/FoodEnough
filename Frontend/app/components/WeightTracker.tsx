"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { WeightEntry } from "../hooks/useProfile";

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
}: WeightTrackerProps) {
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
                    tickFormatter={(t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${displayWeight(v)} ${unitLabel}`}
                  />
                  <Tooltip
                    formatter={(v: any) => [`${displayWeight(v as number)} ${unitLabel}`, 'Weight']}
                    labelFormatter={(t) => new Date(t).toLocaleDateString()}
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
                    {new Date(e.timestamp).toLocaleDateString()}
                  </span>
                  <span className="font-semibold text-green-700">{displayWeight(e.weight_lbs)} {unitLabel}</span>
                </li>
              ))}
            </ul>
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
