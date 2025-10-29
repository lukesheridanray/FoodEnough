"use client";
import { useState, useEffect } from "react";
import { Bell, Plus, Home, BarChart2, Dumbbell, User } from "lucide-react";

export default function FoodEnoughApp() {
  const [activeTab, setActiveTab] = useState("home");
  const [logs, setLogs] = useState<any[]>([]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // Fetch today's logs
  const loadLogs = async () => {
    try {
      const res = await fetch(`${apiUrl}/logs/today`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex flex-col">
      {/* Status Bar Placeholder */}
      <div className="h-6" />

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-green-800 font-medium text-lg">
            🌿 FoodEnough
          </span>
        </div>
        <div className="relative">
          <Bell className="w-7 h-7 text-green-800" />
          <span className="absolute top-0 right-0 block w-2 h-2 bg-orange-500 rounded-full" />
        </div>
      </header>

      {/* Today’s Summary */}
      <section className="px-5 mt-2">
        <h2 className="text-lg font-bold text-green-900 mb-2">
          Today’s Summary
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[
            {
              label: "Calories Remaining",
              value: "1,350 kcal",
              icon: "🍽",
            },
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
              <div className="text-green-700 font-semibold text-lg">
                {card.value}
              </div>
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
            try {
              const res = await fetch(`${apiUrl}/save_log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input_text: input }),
              });
              if (res.ok) {
                (e.target as any).reset();
                loadLogs(); // refresh log list
              }
            } catch (err) {
              console.error("Error saving meal:", err);
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
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            Log
          </button>
        </form>
      </section>

      {/* My Logs Section */}
      <section className="flex-1 px-5 mt-4 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-green-900">My Logs</h2>
          <button
            onClick={() => window.open(`${apiUrl}/logs/export`, "_blank")}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
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
                  <div className="font-semibold text-gray-800">
                    {log.input_text}
                  </div>
                  <div className="text-sm text-gray-500">
                    {log.calories} kcal • {log.protein}P • {log.carbs}C •{" "}
                    {log.fat}F
                  </div>
                </div>
                <div className="text-2xl">🍽</div>
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

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-md flex justify-around items-center py-3 shadow-md">
        {[
          { id: "home", icon: <Home />, label: "Home" },
          { id: "macros", icon: <BarChart2 />, label: "Macros" },
          { id: "workouts", icon: <Dumbbell />, label: "Workouts" },
          { id: "profile", icon: <User />, label: "Profile" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center text-sm transition-colors ${
              activeTab === tab.id ? "text-green-700" : "text-gray-400"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
