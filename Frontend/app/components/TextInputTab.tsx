"use client";
import { useState, useRef } from "react";
import { apiFetch, UnauthorizedError } from "../../lib/api";

interface TextInputTabProps {
  onLogged: () => void;
  onUnauthorized: () => void;
  onSwitchToBarcode: () => void;
}

export default function TextInputTab({ onLogged, onUnauthorized, onSwitchToBarcode }: TextInputTabProps) {
  const [mealError, setMealError] = useState("");
  const [mealSuccess, setMealSuccess] = useState(false);
  const [logging, setLogging] = useState(false);
  const mealInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const input = mealInputRef.current?.value ?? "";
          if (!input.trim()) return;
          setMealError("");
          setLogging(true);
          try {
            const tzOffset = -new Date().getTimezoneOffset();
            const res = await apiFetch(`/save_log?tz_offset_minutes=${tzOffset}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ input_text: input }),
            });
            if (res.ok) {
              if (mealInputRef.current) mealInputRef.current.value = "";
              onLogged();
              setMealSuccess(true);
              setTimeout(() => setMealSuccess(false), 2000);
            } else {
              setMealError("Failed to log meal. Please try again.");
            }
          } catch (err) {
            if (err instanceof UnauthorizedError) { onUnauthorized(); return; }
            console.error("Error saving meal:", err);
            setMealError("Connection failed. Please try again.");
          } finally {
            setLogging(false);
          }
        }}
        className="flex gap-2 items-center"
      >
        <input
          ref={mealInputRef}
          name="meal"
          placeholder="e.g. chicken rice and broccoli"
          className="flex-1 border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={logging}
          className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {logging ? "Logging\u2026" : "Log"}
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
      </div>
      {mealError && <p className="text-red-500 text-sm mt-2">{mealError}</p>}
      {mealSuccess && <p className="text-green-600 text-sm mt-2 font-medium">{"\u2713"} Meal logged!</p>}
    </div>
  );
}
