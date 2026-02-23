"use client";
import { useState, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { apiFetch, UnauthorizedError } from "../../lib/api";
import { getTzOffsetMinutes } from "../../lib/auth";

interface ParsedItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ParsedResult {
  description: string;
  items: ParsedItem[];
  total: { calories: number; protein: number; carbs: number; fat: number };
}

interface TextInputTabProps {
  onLogged: () => void;
  onUnauthorized: () => void;
  onSwitchToBarcode: () => void;
}

export default function TextInputTab({ onLogged, onUnauthorized, onSwitchToBarcode }: TextInputTabProps) {
  const [mealError, setMealError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [inputText, setInputText] = useState("");
  const mealInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = mealInputRef.current?.value ?? "";
    if (!input.trim()) return;
    setMealError("");
    setParsed(null);
    setInputText(input);
    setAnalyzing(true);
    try {
      const res = await apiFetch("/parse_log/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_text: input }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.parsed) {
          setParsed(data.parsed);
        } else {
          setMealError("Could not parse that meal. Try being more specific.");
        }
      } else {
        setMealError("Failed to analyze meal. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { onUnauthorized(); return; }
      setMealError("Connection failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    setSaving(true);
    setMealError("");
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/logs/save-parsed?tz_offset_minutes=${tzOffset}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_text: inputText,
          calories: parsed.total.calories,
          protein: parsed.total.protein,
          carbs: parsed.total.carbs,
          fat: parsed.total.fat,
          fiber: null,
          sugar: null,
          sodium: null,
          parsed_json: JSON.stringify(parsed),
        }),
      });
      if (res.ok) {
        setParsed(null);
        setInputText("");
        if (mealInputRef.current) mealInputRef.current.value = "";
        onLogged();
      } else {
        setMealError("Failed to save. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { onUnauthorized(); return; }
      setMealError("Connection failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    setParsed(null);
    setMealError("");
  };

  return (
    <div>
      {/* Input form — hidden when preview is showing */}
      {!parsed && (
        <>
          <form onSubmit={handleAnalyze} className="flex gap-2 items-center">
            <input
              ref={mealInputRef}
              name="meal"
              placeholder="e.g. chicken rice and broccoli"
              disabled={analyzing}
              className="flex-1 border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={analyzing}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing{"\u2026"}</> : "Analyze"}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-1.5">
            Packaged product? Use{" "}
            <button
              onClick={onSwitchToBarcode}
              className="text-green-600 font-medium underline-offset-2 hover:underline"
            >
              Barcode
            </button>
            {" "}for exact label data.
          </p>
        </>
      )}

      {/* Preview card */}
      {parsed && (
        <div className="bg-white rounded-2xl p-3 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700 flex-1 mr-2">
              {parsed.description || inputText}
            </p>
            <button
              onClick={handleDismiss}
              disabled={saving}
              className="text-gray-300 hover:text-gray-500 flex-shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-3 py-1.5 font-medium">Item</th>
                  <th className="text-right px-2 py-1.5 font-medium">kcal</th>
                  <th className="text-right px-2 py-1.5 font-medium text-blue-500">P</th>
                  <th className="text-right px-2 py-1.5 font-medium text-amber-500">C</th>
                  <th className="text-right px-2 py-1.5 font-medium text-orange-500">F</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parsed.items.map((item, i) => (
                  <tr key={i + item.name} className="text-gray-700">
                    <td className="px-3 py-1.5 capitalize">{item.name}</td>
                    <td className="text-right px-2 py-1.5">{item.calories}</td>
                    <td className="text-right px-2 py-1.5">{item.protein}g</td>
                    <td className="text-right px-2 py-1.5">{item.carbs}g</td>
                    <td className="text-right px-2 py-1.5">{item.fat}g</td>
                  </tr>
                ))}
                <tr className="bg-green-50 font-semibold text-green-800">
                  <td className="px-3 py-1.5">Total</td>
                  <td className="text-right px-2 py-1.5">{parsed.total.calories}</td>
                  <td className="text-right px-2 py-1.5">{parsed.total.protein}g</td>
                  <td className="text-right px-2 py-1.5">{parsed.total.carbs}g</td>
                  <td className="text-right px-2 py-1.5">{parsed.total.fat}g</td>
                </tr>
              </tbody>
            </table>
          </div>
          {mealError && <p className="text-red-500 text-xs">{mealError}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-medium rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Saving{"\u2026"}</>
            ) : (
              "Save Log \u2192"
            )}
          </button>
        </div>
      )}

      {/* Error when no preview */}
      {!parsed && mealError && <p className="text-red-500 text-sm mt-2">{mealError}</p>}
    </div>
  );
}
