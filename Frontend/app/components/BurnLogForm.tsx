"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Flame, Loader2, Check } from "lucide-react";
import { BurnLogCreateInput } from "../hooks/useBurnLogs";

const WORKOUT_TYPES = [
  { value: "weight_training", label: "Weight Training" },
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "swimming", label: "Swimming" },
  { value: "walking", label: "Walking" },
  { value: "hiit", label: "HIIT" },
  { value: "yoga", label: "Yoga" },
  { value: "other", label: "Other" },
];

interface BurnLogFormProps {
  onSubmit: (input: BurnLogCreateInput) => Promise<boolean>;
  error: string;
  onErrorClear: () => void;
}

export default function BurnLogForm({ onSubmit, error, onErrorClear }: BurnLogFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [workoutType, setWorkoutType] = useState("weight_training");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!calories.trim()) return;
    onErrorClear();
    setSaving(true);
    const input: BurnLogCreateInput = {
      workout_type: workoutType,
      calories_burned: parseFloat(calories),
    };
    if (duration.trim()) input.duration_minutes = parseInt(duration, 10);
    if (avgHr.trim()) input.avg_heart_rate = parseInt(avgHr, 10);
    if (maxHr.trim()) input.max_heart_rate = parseInt(maxHr, 10);
    if (notes.trim()) input.notes = notes.trim();

    const ok = await onSubmit(input);
    setSaving(false);
    if (ok) {
      setSuccess(true);
      setCalories("");
      setDuration("");
      setAvgHr("");
      setMaxHr("");
      setNotes("");
      setTimeout(() => setSuccess(false), 1500);
    }
  };

  return (
    <section className="px-5 mt-3">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Flame className="w-3.5 h-3.5 text-red-500" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Log Workout</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Workout Type</label>
              <select
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:outline-none bg-white"
              >
                {WORKOUT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Calories Burned *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 350"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Duration (min)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 45"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Avg Heart Rate</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 140"
                  value={avgHr}
                  onChange={(e) => setAvgHr(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max Heart Rate</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 175"
                  value={maxHr}
                  onChange={(e) => setMaxHr(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input
                type="text"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:outline-none"
              />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={saving || success || !calories.trim()}
              className={`w-full py-2 text-sm font-medium rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors ${
                success
                  ? "bg-green-100 text-green-700"
                  : "bg-gradient-to-r from-red-500 to-orange-500 text-white disabled:opacity-60"
              }`}
            >
              {success ? (
                <><Check className="w-4 h-4" /> Logged!</>
              ) : saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                "Log Workout"
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
