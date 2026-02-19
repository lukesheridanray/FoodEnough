"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, authHeaders } from "../../lib/auth";
import BottomNav from "../components/BottomNav";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Profile {
  email: string;
  calorie_goal: number | null;
  protein_goal: number | null;
  carbs_goal: number | null;
  fat_goal: number | null;
}

interface WeightEntry {
  id: number;
  weight_lbs: number;
  timestamp: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Goal form state
  const [calorieGoal, setCalorieGoal] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [carbsGoal, setCarbsGoal] = useState("");
  const [fatGoal, setFatGoal] = useState("");
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalsSuccess, setGoalsSuccess] = useState(false);
  const [goalsError, setGoalsError] = useState("");

  // Weight state
  const [weightInput, setWeightInput] = useState("");
  const [loggingWeight, setLoggingWeight] = useState(false);
  const [weightError, setWeightError] = useState("");
  const [weightSuccess, setWeightSuccess] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [weightHistoryError, setWeightHistoryError] = useState("");

  const handleUnauthorized = () => {
    removeToken();
    router.push("/login");
  };

  const parseApiError = (detail: any): string => {
    if (!detail) return "An error occurred.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg ?? String(d)).join(", ");
    return String(detail);
  };

  const loadProfile = async () => {
    try {
      const res = await fetch(`${apiUrl}/profile`, { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const data: Profile = await res.json();
      setProfile(data);
      setCalorieGoal(data.calorie_goal?.toString() ?? "");
      setProteinGoal(data.protein_goal?.toString() ?? "");
      setCarbsGoal(data.carbs_goal?.toString() ?? "");
      setFatGoal(data.fat_goal?.toString() ?? "");
    } catch {
      // non-fatal
    }
  };

  const loadWeightHistory = async () => {
    try {
      const res = await fetch(`${apiUrl}/weight/history`, { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) { setWeightHistoryError("Failed to load weight history."); return; }
      const data = await res.json();
      // Reverse so chart goes oldest → newest left to right
      setWeightHistory((data.entries || []).slice().reverse());
    } catch {
      setWeightHistoryError("Network error loading weight history.");
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    Promise.all([loadProfile(), loadWeightHistory()]).finally(() => setLoading(false));
  }, []);

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalsError("");
    setGoalsSuccess(false);
    setSavingGoals(true);
    try {
      const body: any = {
        calorie_goal: calorieGoal ? parseInt(calorieGoal) : null,
        protein_goal: proteinGoal ? parseInt(proteinGoal) : null,
        carbs_goal: carbsGoal ? parseInt(carbsGoal) : null,
        fat_goal: fatGoal ? parseInt(fatGoal) : null,
      };
      const res = await fetch(`${apiUrl}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        setGoalsSuccess(true);
        loadProfile();
        setTimeout(() => setGoalsSuccess(false), 3000);
      } else {
        const err = await res.json();
        setGoalsError(parseApiError(err.detail) || "Failed to save goals.");
      }
    } catch {
      setGoalsError("Network error. Is the backend running?");
    } finally {
      setSavingGoals(false);
    }
  };

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightInput);
    if (!weightInput || isNaN(val)) return;
    setWeightError("");
    setWeightSuccess(false);
    setLoggingWeight(true);
    try {
      const res = await fetch(`${apiUrl}/weight`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ weight_lbs: val }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        setWeightInput("");
        setWeightSuccess(true);
        loadWeightHistory();
        setTimeout(() => setWeightSuccess(false), 3000);
      } else {
        const err = await res.json();
        setWeightError(parseApiError(err.detail) || "Failed to log weight.");
      }
    } catch {
      setWeightError("Network error. Is the backend running?");
    } finally {
      setLoggingWeight(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
      <div className="h-6" />
      <header className="px-5 py-3">
        <h1 className="text-xl font-bold text-green-900">Profile & Settings</h1>
        {profile && <p className="text-sm text-gray-500">{profile.email}</p>}
      </header>

      {/* Calorie & Macro Goals */}
      <section className="px-5 mt-4">
        <h2 className="text-lg font-bold text-green-900 mb-2">Daily Goals</h2>
        <form onSubmit={handleSaveGoals} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Calories (kcal)</label>
              <input
                type="number"
                value={calorieGoal}
                onChange={(e) => setCalorieGoal(e.target.value)}
                placeholder="e.g. 2000"
                className="mt-1 w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Protein (g)</label>
              <input
                type="number"
                value={proteinGoal}
                onChange={(e) => setProteinGoal(e.target.value)}
                placeholder="e.g. 150"
                className="mt-1 w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Carbs (g)</label>
              <input
                type="number"
                value={carbsGoal}
                onChange={(e) => setCarbsGoal(e.target.value)}
                placeholder="e.g. 200"
                className="mt-1 w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Fat (g)</label>
              <input
                type="number"
                value={fatGoal}
                onChange={(e) => setFatGoal(e.target.value)}
                placeholder="e.g. 65"
                className="mt-1 w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
          </div>
          {goalsError && <p className="text-red-500 text-sm">{goalsError}</p>}
          {goalsSuccess && <p className="text-green-600 text-sm font-medium">Goals saved!</p>}
          <button
            type="submit"
            disabled={savingGoals}
            className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-medium shadow-md disabled:opacity-60"
          >
            {savingGoals ? "Saving…" : "Save Goals"}
          </button>
        </form>
      </section>

      {/* Weight Logging */}
      <section className="px-5 mt-4">
        <h2 className="text-lg font-bold text-green-900 mb-2">Log Weight</h2>
        <form onSubmit={handleLogWeight} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex gap-2 items-center">
            <input
              type="number"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="Weight in lbs"
              className="flex-1 border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loggingWeight || !weightInput}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loggingWeight ? "Saving…" : "Log"}
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
                  tickFormatter={(v) => `${v} lb`}
                />
                <Tooltip
                  formatter={(v: any) => [`${v} lb`, "Weight"]}
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

          {/* Recent entries list */}
          <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Entries</h3>
            <ul className="space-y-1">
              {[...weightHistory].reverse().slice(0, 10).map((e) => (
                <li key={e.id} className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {new Date(e.timestamp).toLocaleDateString()}
                  </span>
                  <span className="font-semibold text-green-700">{e.weight_lbs} lb</span>
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

      <BottomNav />
    </div>
  );
}
