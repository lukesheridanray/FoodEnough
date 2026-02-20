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
  age?: number | null;
  sex?: string | null;
  height_cm?: number | null;
  activity_level?: string | null;
  goal_type?: string | null;
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

  // Anthropometric / calculator state
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<"M" | "F" | "">("");
  const [heightFt, setHeightFt] = useState<string>("");
  const [heightIn, setHeightIn] = useState<string>("");
  const [surveyWeight, setSurveyWeight] = useState<string>("");
  const [activityLevel, setActivityLevel] = useState<string>("");
  // CHANGE 1: goalType persists in localStorage
  const [goalType, setGoalType] = useState<"lose" | "maintain" | "gain">(() => {
    if (typeof window === 'undefined') return 'maintain';
    return (localStorage.getItem('goalType') as 'lose' | 'maintain' | 'gain') ?? 'maintain';
  });
  // CHANGE 2: survey mode state
  const [surveyMode, setSurveyMode] = useState(false);
  const [surveyStep, setSurveyStep] = useState(0); // 0=sex, 1=age+height, 2=activity, 3=goal
  const [calculatedGoals, setCalculatedGoals] = useState<{
    calorie_goal: number;
    protein_goal: number;
    carbs_goal: number;
    fat_goal: number;
    tdee: number;
    bmr: number;
    weight_lbs_used: number;
  } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [usedDefaultWeight, setUsedDefaultWeight] = useState(false);

  // Today's summary state
  const [todaySummary, setTodaySummary] = useState<{
    calories_today: number;
    protein_today: number;
    carbs_today: number;
    fat_today: number;
    calorie_goal: number | null;
    protein_goal: number | null;
    carbs_goal: number | null;
    fat_goal: number | null;
  } | null>(null);

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
      if (data.age) setAge(String(data.age));
      if (data.sex) setSex(data.sex as "M" | "F");
      if (data.height_cm) {
        const totalIn = data.height_cm / 2.54;
        setHeightFt(String(Math.floor(totalIn / 12)));
        setHeightIn(String(Math.round(totalIn % 12)));
      }
      if (data.activity_level) setActivityLevel(data.activity_level);
      if (data.goal_type) setGoalType(data.goal_type as 'lose' | 'maintain' | 'gain');
      // CHANGE 3: detect if profile is incomplete and enter survey mode
      const profileComplete = !!(data.age && data.sex && data.height_cm && data.activity_level);
      setSurveyMode(!profileComplete);
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

  const loadTodaySummary = async () => {
    try {
      const tzOffset = -new Date().getTimezoneOffset();
      const summaryRes = await fetch(
        `${API_URL}/summary/today?tz_offset_minutes=${tzOffset}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (summaryRes.ok) setTodaySummary(await summaryRes.json());
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    Promise.all([loadProfile(), loadWeightHistory(), loadTodaySummary()]).finally(() => setLoading(false));
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

  const handleCalculateGoals = async () => {
    setCalcError("");
    const heightCm = heightFt ? ((parseInt(heightFt) * 12 + parseInt(heightIn || "0")) * 2.54) : 0;
    if (!age || !sex || !heightFt || !activityLevel) {
      setCalcError("Please fill in all fields above.");
      return;
    }
    localStorage.setItem('goalType', goalType);
    setCalculating(true);
    try {
      // Log survey weight first so calculate-goals picks it up
      if (surveyWeight) {
        const wLbs = weightUnit === 'kg'
          ? parseFloat(surveyWeight) * 2.20462
          : parseFloat(surveyWeight);
        if (wLbs > 0) {
          await fetch(`${API_URL}/weight`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ weight_lbs: Math.round(wLbs * 10) / 10 }),
          });
          loadWeightHistory();
        }
      }
      const res = await fetch(`${API_URL}/profile/calculate-goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          age: parseInt(age),
          sex,
          height_cm: Math.round(heightCm * 10) / 10,
          activity_level: activityLevel,
          goal_type: goalType,
        }),
      });
      if (res.status === 401) { removeToken(); router.push("/login"); return; }
      if (res.ok) {
        const goals = await res.json();
        setCalculatedGoals(goals);
        if (goals.weight_lbs_used === 154 && !surveyWeight) setUsedDefaultWeight(true);
        // Update the displayed goal inputs with the calculated values
        setCalorieGoal(String(goals.calorie_goal));
        setProteinGoal(String(goals.protein_goal));
        setCarbsGoal(String(goals.carbs_goal));
        setFatGoal(String(goals.fat_goal));
        // CHANGE 4b: exit survey mode on success
        setSurveyMode(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setCalcError(err.detail || "Calculation failed. Please try again.");
      }
    } catch {
      setCalcError("Connection failed. Please try again.");
    } finally {
      setCalculating(false);
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
      {/* CHANGE 7: safe area inset */}
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
      <header className="px-5 py-3">
        <h1 className="text-xl font-bold text-green-900">Profile & Settings</h1>
        {profile && <p className="text-sm text-gray-500">{profile.email}</p>}
      </header>

      {/* CHANGE 5: Health Profile — Survey or Summary */}
      {surveyMode ? (
        /* ── SURVEY MODE ── */
        <section className="px-5 mt-6">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            {/* Progress dots */}
            <div className="flex gap-1.5 mb-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i <= surveyStep ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* Step 0 — Sex */}
            {surveyStep === 0 && (
              <div>
                <h2 className="text-base font-bold text-green-900 mb-1">Let's set your goals</h2>
                <p className="text-sm text-gray-500 mb-4">What's your biological sex?</p>
                <div className="flex gap-3">
                  {(["M", "F"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSex(s); setSurveyStep(1); }}
                      className={`flex-1 py-4 text-sm font-semibold rounded-2xl border-2 transition-all ${
                        sex === s ? "border-green-500 text-green-700 bg-green-50" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {s === "M" ? "Male" : "Female"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1 — Age + Height */}
            {surveyStep === 1 && (
              <div>
                <h2 className="text-base font-bold text-green-900 mb-1">Your stats</h2>
                <p className="text-sm text-gray-500 mb-4">We use these to calculate your metabolism accurately.</p>
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 28"
                      min={10} max={100}
                      className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Height</label>
                    <div className="flex gap-2 mt-1.5">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          value={heightFt}
                          onChange={(e) => setHeightFt(e.target.value)}
                          placeholder="5"
                          min={3} max={8}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-7 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">ft</span>
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          value={heightIn}
                          onChange={(e) => setHeightIn(e.target.value)}
                          placeholder="10"
                          min={0} max={11}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-7 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">in</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { if (age && heightFt) setSurveyStep(2); }}
                  disabled={!age || !heightFt}
                  className="w-full py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-40"
                >
                  Continue →
                </button>
                <button onClick={() => setSurveyStep(0)} className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
              </div>
            )}

            {/* Step 2 — Weight */}
            {surveyStep === 2 && (
              <div>
                <h2 className="text-base font-bold text-green-900 mb-1">Your current weight</h2>
                <p className="text-sm text-gray-500 mb-4">Used to calculate your calorie needs. This will be logged to your weight history.</p>
                <div className="flex gap-2 mb-2">
                  {(['lbs', 'kg'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => toggleWeightUnit(u)}
                      className={`flex-1 py-2 text-sm font-medium rounded-xl border-2 transition-all ${
                        weightUnit === u ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={surveyWeight}
                    onChange={(e) => setSurveyWeight(e.target.value)}
                    placeholder={weightUnit === 'lbs' ? "e.g. 175" : "e.g. 79"}
                    min={50} max={700}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 pr-12 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-center text-lg font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{weightUnit}</span>
                </div>
                <button
                  onClick={() => { if (surveyWeight) setSurveyStep(3); }}
                  disabled={!surveyWeight}
                  className="mt-4 w-full py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-40"
                >
                  Continue →
                </button>
                <button onClick={() => setSurveyStep(1)} className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
              </div>
            )}

            {/* Step 3 — Activity */}
            {surveyStep === 3 && (
              <div>
                <h2 className="text-base font-bold text-green-900 mb-1">Activity level</h2>
                <p className="text-sm text-gray-500 mb-3">How active are you on a typical week?</p>
                <div className="space-y-2">
                  {[
                    { value: "sedentary",   label: "Sedentary",          desc: "Desk job, little/no exercise" },
                    { value: "light",       label: "Lightly active",     desc: "Exercise 1–3 days/week" },
                    { value: "moderate",    label: "Moderately active",  desc: "Exercise 3–5 days/week" },
                    { value: "active",      label: "Very active",        desc: "Hard exercise 6–7 days/week" },
                    { value: "very_active", label: "Extra active",       desc: "Physical job + daily training" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setActivityLevel(opt.value); setSurveyStep(4); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                        activityLevel === opt.value
                          ? "border-green-500 bg-green-50"
                          : "border-gray-100 hover:border-green-200"
                      }`}
                    >
                      <span className={`text-sm font-medium ${activityLevel === opt.value ? "text-green-700" : "text-gray-700"}`}>
                        {opt.label}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">{opt.desc}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setSurveyStep(2)} className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
              </div>
            )}

            {/* Step 4 — Goal + Calculate */}
            {surveyStep === 4 && (
              <div>
                <h2 className="text-base font-bold text-green-900 mb-1">What's your goal?</h2>
                <p className="text-sm text-gray-500 mb-3">We'll tailor your calorie and macro targets to this.</p>
                <div className="space-y-2 mb-4">
                  {([
                    { value: "lose",     label: "Lose weight",  desc: "500 kcal deficit · preserve muscle", color: "border-blue-400 bg-blue-50 text-blue-700" },
                    { value: "maintain", label: "Maintain",     desc: "Eat at your TDEE",                   color: "border-green-500 bg-green-50 text-green-700" },
                    { value: "gain",     label: "Build muscle", desc: "300 kcal surplus · high protein",     color: "border-orange-400 bg-orange-50 text-orange-700" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setGoalType(opt.value)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                        goalType === opt.value ? opt.color : "border-gray-100 hover:border-gray-200 text-gray-700"
                      }`}
                    >
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className="text-xs text-gray-400 ml-2">{opt.desc}</span>
                    </button>
                  ))}
                </div>
                {calcError && <p className="text-red-500 text-xs mb-2">{calcError}</p>}
                <button
                  onClick={handleCalculateGoals}
                  disabled={calculating}
                  className="w-full py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {calculating ? <><span className="animate-spin inline-block">⟳</span> Calculating…</> : "Calculate My Goals →"}
                </button>
                <button onClick={() => setSurveyStep(3)} className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
              </div>
            )}
          </div>
        </section>
      ) : (
        /* ── PROFILE COMPLETE — Summary card ── */
        <section className="px-5 mt-6">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-green-900">Health Profile</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {sex === "M" ? "Male" : sex === "F" ? "Female" : ""}{age ? ` · ${age} yrs` : ""}{heightFt ? ` · ${heightFt}'${heightIn || "0"}"` : ""}
                  {activityLevel ? ` · ${activityLevel.replace("_", " ")}` : ""}
                </p>
              </div>
              <button
                onClick={() => { setSurveyMode(true); setSurveyStep(0); setCalculatedGoals(null); }}
                className="text-xs text-green-600 font-medium hover:text-green-800"
              >
                Edit
              </button>
            </div>

            {/* Goals grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Calories", value: calorieGoal ? `${calorieGoal} kcal` : "—", color: "text-green-700" },
                { label: "Protein",  value: proteinGoal ? `${proteinGoal}g` : "—",     color: "text-blue-600" },
                { label: "Carbs",    value: carbsGoal ? `${carbsGoal}g` : "—",         color: "text-amber-600" },
                { label: "Fat",      value: fatGoal ? `${fatGoal}g` : "—",             color: "text-orange-600" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">
              Goal: <span className="font-medium text-gray-600 capitalize">{goalType === "lose" ? "Lose weight" : goalType === "gain" ? "Build muscle" : "Maintain"}</span>
              {calculatedGoals ? ` · BMR ${calculatedGoals.bmr} · TDEE ${calculatedGoals.tdee} kcal` : ""}
            </p>
            {usedDefaultWeight && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Goals calculated using a default weight (154 lbs). Log your weight in the Weight section below for more accurate goals.
              </div>
            )}
          </div>
        </section>
      )}

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

      {/* Today's Progress */}
      {todaySummary && (todaySummary.calorie_goal || todaySummary.protein_goal) && (
        <section className="px-5 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-green-900 mb-4">Today's Progress</h2>
            <div className="space-y-4">
              {[
                {
                  label: "Calories",
                  value: todaySummary.calories_today,
                  goal: todaySummary.calorie_goal,
                  bar: "bg-green-500",
                  text: "text-green-700",
                  unit: "kcal",
                },
                {
                  label: "Protein",
                  value: todaySummary.protein_today,
                  goal: todaySummary.protein_goal,
                  bar: "bg-blue-500",
                  text: "text-blue-600",
                  unit: "g",
                },
                {
                  label: "Carbs",
                  value: todaySummary.carbs_today,
                  goal: todaySummary.carbs_goal,
                  bar: "bg-amber-500",
                  text: "text-amber-600",
                  unit: "g",
                },
                {
                  label: "Fat",
                  value: todaySummary.fat_today,
                  goal: todaySummary.fat_goal,
                  bar: "bg-orange-500",
                  text: "text-orange-600",
                  unit: "g",
                },
              ].map((item) => {
                const pct = item.goal ? Math.min(100, Math.round((item.value / item.goal) * 100)) : null;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <span className="text-sm">
                        <span className={`font-bold ${item.text}`}>{item.value}{item.unit}</span>
                        {item.goal && (
                          <span className="text-gray-400 text-xs"> / {item.goal}{item.unit}</span>
                        )}
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.bar} rounded-full transition-all`}
                        style={{ width: pct !== null ? `${pct}%` : item.value > 0 ? "100%" : "0%" }}
                      />
                    </div>
                    {pct !== null && (
                      <p className="text-xs text-gray-400 mt-0.5 text-right">{pct}%</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CHANGE 6: Recommendations */}
      {todaySummary && (todaySummary.calorie_goal || todaySummary.protein_goal) && (
        <section className="px-5 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-green-900 mb-3">Today's Recommendations</h2>
            <div className="space-y-2">
              {(() => {
                const tips: { icon: string; text: string; color: string }[] = [];
                const cal = todaySummary.calories_today;
                const calGoal = todaySummary.calorie_goal;
                const pro = todaySummary.protein_today;
                const proGoal = todaySummary.protein_goal;
                const carb = todaySummary.carbs_today;
                const carbGoal = todaySummary.carbs_goal;
                const fat = todaySummary.fat_today;
                const fatGoal = todaySummary.fat_goal;
                const calRem = calGoal ? calGoal - cal : null;

                // No food logged yet
                if (cal === 0) {
                  tips.push({ icon: "🍽", text: "Log your first meal to start tracking today's progress.", color: "text-gray-600" });
                }

                // Calorie tips
                if (calGoal && calRem !== null) {
                  if (calRem < -200) {
                    tips.push({ icon: "⚠️", text: `You're ${Math.abs(calRem)} kcal over your goal — consider a lighter dinner.`, color: "text-red-600" });
                  } else if (calRem < 100) {
                    tips.push({ icon: "✅", text: "Calorie goal hit for today — great work.", color: "text-green-600" });
                  } else if (goalType === "gain" && calRem > 300) {
                    tips.push({ icon: "📈", text: `You still need ${calRem} kcal to hit your surplus — don't skip a meal.`, color: "text-orange-600" });
                  } else if (goalType === "lose" && calRem > 0) {
                    tips.push({ icon: "🎯", text: `${calRem} kcal remaining — you're on track for your deficit.`, color: "text-blue-600" });
                  } else if (goalType === "maintain" && calRem > 0) {
                    tips.push({ icon: "⚖️", text: `${calRem} kcal remaining to hit your maintenance target.`, color: "text-green-700" });
                  }
                }

                // Protein tips
                if (proGoal && pro > 0) {
                  const proteinPct = Math.round((pro / proGoal) * 100);
                  if (proteinPct >= 100) {
                    tips.push({ icon: "💪", text: "Protein goal hit — your muscles are taken care of.", color: "text-blue-600" });
                  } else if (proteinPct < 50 && cal > (calGoal ?? 0) * 0.5) {
                    tips.push({ icon: "🥩", text: `Protein is at ${proteinPct}% — add a lean protein source to your next meal.`, color: "text-blue-600" });
                  }
                } else if (proGoal && pro === 0 && cal > 0) {
                  tips.push({ icon: "🥩", text: "No protein tracked yet — prioritise a protein source at your next meal.", color: "text-blue-600" });
                }

                // Goal-specific tips
                if (goalType === "lose") {
                  if (proGoal && pro >= proGoal * 0.8) {
                    tips.push({ icon: "🏆", text: "High protein is helping preserve muscle while you cut — keep it up.", color: "text-green-600" });
                  }
                }

                if (goalType === "gain") {
                  if (carbGoal && carb < carbGoal * 0.5 && cal > 0) {
                    tips.push({ icon: "🍚", text: "Carbs are low for a muscle-building day — fuel your training.", color: "text-amber-600" });
                  }
                }

                // Fallback
                if (tips.length === 0) {
                  tips.push({ icon: "✨", text: "Everything on track — keep logging to stay consistent.", color: "text-green-600" });
                }

                return tips.slice(0, 3).map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl">
                    <span className="text-base flex-shrink-0">{tip.icon}</span>
                    <p className={`text-sm ${tip.color}`}>{tip.text}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </section>
      )}

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
          {weightHistory.length === 1 ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-sm font-semibold text-gray-700">
                {displayWeight(weightHistory[0].weight_lbs)} {unitLabel}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Log one more weight entry to see your trend.
              </p>
            </div>
          ) : (
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
          )}

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
