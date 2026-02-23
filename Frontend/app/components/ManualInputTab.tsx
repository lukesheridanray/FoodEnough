"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { apiFetch, UnauthorizedError } from "../../lib/api";
import { getTzOffsetMinutes } from "../../lib/auth";

interface ManualInputTabProps {
  onLogged: () => void;
  onUnauthorized: () => void;
}

export default function ManualInputTab({ onLogged, onUnauthorized }: ManualInputTabProps) {
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualFiber, setManualFiber] = useState("");
  const [manualSugar, setManualSugar] = useState("");
  const [manualSodium, setManualSodium] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState(false);
  const [showManualAdvanced, setShowManualAdvanced] = useState(false);

  const handleManualSave = async () => {
    if (!manualName.trim()) { setManualError("Food name is required."); return; }
    const _cal = parseFloat(manualCalories) || 0;
    const _pro = parseFloat(manualProtein) || 0;
    const _carb = parseFloat(manualCarbs) || 0;
    const _fat = parseFloat(manualFat) || 0;
    const _fiber = manualFiber ? parseFloat(manualFiber) : null;
    const _sugar = manualSugar ? parseFloat(manualSugar) : null;
    const _sodium = manualSodium ? parseFloat(manualSodium) : null;
    if ([_cal, _pro, _carb, _fat].some((v) => v < 0) ||
        [_fiber, _sugar, _sodium].some((v) => v != null && v < 0)) {
      setManualError("Nutrient values cannot be negative.");
      return;
    }
    setManualError("");
    setManualLoading(true);
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/logs/manual?tz_offset_minutes=${tzOffset}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualName.trim(),
          calories: _cal,
          protein: _pro,
          carbs: _carb,
          fat: _fat,
          fiber: _fiber,
          sugar: _sugar,
          sodium: _sodium,
        }),
      });
      if (res.ok) {
        setManualName(""); setManualCalories(""); setManualProtein("");
        setManualCarbs(""); setManualFat(""); setManualFiber("");
        setManualSugar(""); setManualSodium(""); setShowManualAdvanced(false);
        onLogged();
        setManualSuccess(true);
        setTimeout(() => setManualSuccess(false), 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        setManualError(err.detail || "Failed to save. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { onUnauthorized(); return; }
      setManualError("Connection failed. Please try again.");
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <input
        value={manualName}
        onChange={(e) => setManualName(e.target.value)}
        placeholder="Food name (e.g. Greek yogurt, whole milk)"
        className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Calories (kcal)", value: manualCalories, set: setManualCalories },
          { label: "Protein (g)", value: manualProtein, set: setManualProtein },
          { label: "Carbs (g)", value: manualCarbs, set: setManualCarbs },
          { label: "Fat (g)", value: manualFat, set: setManualFat },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShowManualAdvanced(!showManualAdvanced)}
        className="text-xs text-green-600 font-medium flex items-center gap-1"
      >
        {showManualAdvanced ? "\u25be" : "\u25b8"} More nutrients
      </button>
      {showManualAdvanced && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Fiber (g)", value: manualFiber, set: setManualFiber },
            { label: "Sugar (g)", value: manualSugar, set: setManualSugar },
            { label: "Sodium (mg)", value: manualSodium, set: setManualSodium },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
              <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => set(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}
      {manualError && <p className="text-red-500 text-xs">{manualError}</p>}
      <button
        onClick={handleManualSave}
        disabled={manualLoading || !manualName.trim()}
        className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-medium rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
      >
        {manualLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Saving{"\u2026"}</>
        ) : manualSuccess ? "\u2713 Saved!" : "Save Log \u2192"}
      </button>
    </div>
  );
}
