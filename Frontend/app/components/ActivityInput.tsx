"use client";
import { useState, useEffect } from "react";
import { Flame, Footprints, ChevronDown, ChevronUp, Loader2, Check } from "lucide-react";
import { HealthMetricData } from "../hooks/useHealthMetrics";

interface ActivityInputProps {
  todayMetric: HealthMetricData | null;
  loading: boolean;
  saving: boolean;
  saveError: string;
  saveSuccess: boolean;
  onSave: (data: {
    total_expenditure?: number;
    steps?: number;
  }) => void;
}

export default function ActivityInput({
  todayMetric,
  loading,
  saving,
  saveError,
  saveSuccess,
  onSave,
}: ActivityInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [totalExp, setTotalExp] = useState("");
  const [steps, setSteps] = useState("");

  // Pre-populate from existing today data
  useEffect(() => {
    if (todayMetric) {
      if (todayMetric.total_expenditure != null) setTotalExp(String(todayMetric.total_expenditure));
      if (todayMetric.steps != null) setSteps(String(todayMetric.steps));
    }
  }, [todayMetric]);

  const handleSave = () => {
    const data: Record<string, number> = {};
    if (totalExp.trim()) data.total_expenditure = parseFloat(totalExp);
    if (steps.trim()) data.steps = parseInt(steps, 10);
    if (Object.keys(data).length === 0) return;
    onSave(data);
  };

  const hasData = todayMetric && (
    todayMetric.total_expenditure != null ||
    todayMetric.steps != null
  );

  if (loading) return null;

  return (
    <section className="px-5 mt-3">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Collapsed header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Daily Activity</span>
            {hasData && !expanded && (
              <span className="text-xs text-gray-400 ml-1">
                {todayMetric!.total_expenditure != null && `${todayMetric!.total_expenditure} kcal`}
                {todayMetric!.steps != null && (todayMetric!.total_expenditure != null ? " \u00b7 " : "") + `${todayMetric!.steps.toLocaleString()} steps`}
              </span>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Expanded form */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Total Expenditure (kcal)</label>
              <div className="relative">
                <Flame className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 2400"
                  value={totalExp}
                  onChange={(e) => setTotalExp(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-300 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Steps</label>
              <div className="relative">
                <Footprints className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 8000"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-300 focus:outline-none"
                />
              </div>
            </div>

            {saveError && <p className="text-red-500 text-xs">{saveError}</p>}

            <button
              onClick={handleSave}
              disabled={saving || saveSuccess || (!totalExp.trim() && !steps.trim())}
              className={`w-full py-2 text-sm font-medium rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors ${
                saveSuccess
                  ? "bg-green-100 text-green-700"
                  : "bg-gradient-to-r from-orange-500 to-orange-400 text-white disabled:opacity-60"
              }`}
            >
              {saveSuccess ? (
                <><Check className="w-4 h-4" /> Saved!</>
              ) : saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                "Save Activity"
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
