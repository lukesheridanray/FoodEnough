"use client";
import { useState, useEffect } from "react";
import { Bell, Plus, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, authHeaders } from "../lib/auth";
import BottomNav from "./components/BottomNav";

export default function FoodEnoughApp() {
  const [logs, setLogs] = useState<any[]>([]);
  const [mealError, setMealError] = useState("");
  const [logging, setLogging] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const router = useRouter();

  const handleUnauthorized = () => {
    removeToken();
    router.push("/login");
  };

  const loadLogs = async () => {
    try {
      const res = await fetch(`${apiUrl}/logs/today`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    loadLogs();
  }, []);

  const handleExport = async () => {
    try {
      const res = await fetch(`${apiUrl}/logs/export`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "food_logs.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex flex-col">
      {/* Status Bar Placeholder */}
      <div className="h-6" />

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3">
        <span className="text-green-800 font-medium text-lg">🌿 FoodEnough</span>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} title="Log out">
            <LogOut className="w-5 h-5 text-green-700" />
          </button>
          <div className="relative">
            <Bell className="w-7 h-7 text-green-800" />
            <span className="absolute top-0 right-0 block w-2 h-2 bg-orange-500 rounded-full" />
          </div>
        </div>
      </header>

      {/* Today's Summary */}
      <section className="px-5 mt-2">
        <h2 className="text-lg font-bold text-green-900 mb-2">Today's Summary</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[
            { label: "Calories Remaining", value: "1,350 kcal", icon: "🍽" },
            { label: "Workout Plan", value: "Push Day", icon: "💪" },
            { label: "Current Weight", value: "273 lb", icon: "⚖️" },
            { label: "Next Meal", value: "2 hours", icon: "🕒" },
          ].map((card, i) => (
            <div
              key={i}
              className="flex-shrink-0 bg-white rounded-2xl shadow-sm p-4 w-48"
            >
              <div className="text-3xl mb-1">{card.icon}</div>
              <div className="text-sm text-gray-600">{card.label}</div>
              <div className="text-green-700 font-semibold text-lg">{card.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Add Food Form */}
      <section className="px-5 mt-4">
        <h2 className="text-lg font-bold text-green-900 mb-2">Add Meal</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const input = (e.target as any).meal.value;
            if (!input.trim()) return;
            setMealError("");
            setLogging(true);
            try {
              const res = await fetch(`${apiUrl}/save_log`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...authHeaders(),
                },
                body: JSON.stringify({ input_text: input }),
              });
              if (res.status === 401) {
                handleUnauthorized();
                return;
              }
              if (res.ok) {
                (e.target as any).reset();
                loadLogs();
              } else {
                setMealError("Failed to log meal. Please try again.");
              }
            } catch (err) {
              console.error("Error saving meal:", err);
              setMealError("Network error. Is the backend running?");
            } finally {
              setLogging(false);
            }
          }}
          className="flex gap-2 items-center"
        >
          <input
            name="meal"
            placeholder="e.g. chicken rice and broccoli"
            className="flex-1 border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={logging}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {logging ? "Logging…" : "Log"}
          </button>
        </form>
        {mealError && <p className="text-red-500 text-sm mt-2">{mealError}</p>}
      </section>

      {/* My Logs Section */}
      <section className="flex-1 px-5 mt-4 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-green-900">My Logs</h2>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-500 px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Export CSV
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">No meals logged today.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold text-gray-800">{log.input_text}</div>
                  <div className="text-sm text-gray-500">
                    {log.calories} kcal • {log.protein}P • {log.carbs}C • {log.fat}F
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch(`${apiUrl}/logs/${log.id}`, {
                      method: "DELETE",
                      headers: authHeaders(),
                    });
                    if (res.status === 401) { handleUnauthorized(); return; }
                    if (res.ok) loadLogs();
                  }}
                  className="text-red-400 hover:text-red-600 text-xl ml-3 transition-colors"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Floating Add Button */}
      <button
        onClick={() => alert("Coming soon: Add Meal / AI Workout")}
        className="fixed bottom-20 right-6 w-16 h-16 bg-gradient-to-br from-green-500 to-green-400 text-white rounded-full shadow-lg flex items-center justify-center text-4xl hover:scale-105 transition-transform"
      >
        <Plus className="w-8 h-8" />
      </button>

      <BottomNav />
    </div>
  );
}
