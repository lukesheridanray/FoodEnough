"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function HomePage() {
  const [inputText, setInputText] = useState("");
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchTodayLogs();
  }, []);

  const fetchTodayLogs = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/logs/today");
      setLogs(res.data.logs);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  const handleSave = async () => {
    if (!inputText.trim()) return;
    setSaving(true);

    try {
      await axios.post("http://127.0.0.1:8000/save_log", {
        input_text: inputText,
      });
      setInputText("");
      fetchTodayLogs();
    } catch (err) {
      console.error("Error saving log:", err);
      alert("Failed to save log.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-2">🍽️ FoodEnough – Log a Meal</h1>
        <textarea
          className="w-full border rounded p-2 mb-2 text-sm"
          rows={3}
          placeholder="e.g., 2 eggs, toast with peanut butter, and coffee"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Log"}
        </button>
      </section>

      <section>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-2">
          📅 Today&apos;s Logs
        </h2>
        {logs.length === 0 ? (
          <p className="text-gray-600">No logs found today.</p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log, i) => (
              <li key={i} className="bg-white border p-3 rounded shadow-sm">
                <p className="text-sm text-gray-800">{log.input_text}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {log.calories} cal • {log.protein}g P • {log.carbs}g C •{" "}
                  {log.fat}g F
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
