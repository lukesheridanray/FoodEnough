"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, authHeaders } from "../../lib/auth";
import { API_URL } from "../../lib/config";
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
import { LogOut } from "lucide-react";

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
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>(() => {
    if (typeof window === 'undefined') return 'lbs';
    return (localStorage.getItem('weightUnit') as 'lbs' | 'kg') ?? 'lbs';
  });

  const toggleWeightUnit = (unit: 'lbs' | 'kg') => {
    setWeightUnit(unit);
    localStorage.setItem('weightUnit', unit);
  };

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");

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
      const res = await fetch(`${API_URL}/profile`, { headers: authHeaders() });
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
      const res = await fetch(`${API_URL}/weight/history`, { headers: authHeaders() });
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
      const res = await fetch(`${API_URL}/profile`, {
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
      setGoalsError("Connection failed. Please try again.");
    } finally {
      setSavingGoals(false);
    }
  };

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightInput);
    if (!weightInput || isNaN(val)) return;
    const lbs = weightUnit === 'kg' ? parseFloat((val * 2.20462).toFixed(1)) : val;
    setWeightError("");
    setWeightSuccess(false);
    setLoggingWeight(true);
    try {
      const res = await fetch(`${API_URL}/weight`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ weight_lbs: lbs }),
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
      setWeightError("Connection failed. Please try again.");
    } finally {
      setLoggingWeight(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteAccountError("");
    setDeletingAccount(true);
    try {
      const res = await fetch(`${API_URL}/auth/account`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        removeToken();
        router.push("/login");
      } else {
        const err = await res.json().catch(() => ({}));
        setDeleteAccountError(err.detail || "Failed to delete account. Please try again.");
        setShowDeleteConfirm(false);
      }
    } catch {
      setDeleteAccountError("Connection failed. Please try again.");
      setShowDeleteConfirm(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  const displayWeight = (lbs: number) =>
    weightUnit === 'kg' ? (lbs / 2.20462).toFixed(1) : lbs.toString();

  const unitLabel = weightUnit === 'kg' ? 'kg' : 'lb';

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
        <form onSubmit={handleLogWeight} className="bg-white rounded-2xl p-4 shadow-sm">
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

      <section className="px-5 mt-6 pb-4">
        <button
          onClick={() => { removeToken(); router.push("/login"); }}
          className="w-full py-2 flex items-center justify-center gap-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </section>

      {/* Delete Account */}
      <section className="px-5 mt-3 pb-4">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            Delete account
          </button>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-sm text-gray-700 font-medium">Delete your account?</p>
            <p className="text-xs text-gray-500">
              This will permanently delete your account and all your data — food logs, workouts, weight entries, and goals. This cannot be undone.
            </p>
            {deleteAccountError && (
              <p className="text-red-500 text-xs">{deleteAccountError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteAccountError(""); }}
                disabled={deletingAccount}
                className="flex-1 py-2 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 font-medium"
              >
                {deletingAccount ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
}
