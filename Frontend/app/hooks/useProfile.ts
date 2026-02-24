"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, safeGetItem, safeSetItem, getTzOffsetMinutes } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";

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
  goal_weight_lbs?: number | null;
  is_premium?: boolean;
}

interface WeightEntry {
  id: number;
  weight_lbs: number;
  timestamp: string;
}

interface TodaySummary {
  calories_today: number;
  protein_today: number;
  carbs_today: number;
  fat_today: number;
  calorie_goal: number | null;
  protein_goal: number | null;
  carbs_goal: number | null;
  fat_goal: number | null;
  ani_active?: boolean;
  ani_calorie_goal?: number | null;
  ani_protein_goal?: number | null;
  ani_carbs_goal?: number | null;
  ani_fat_goal?: number | null;
}

interface CalculatedGoals {
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  tdee: number;
  bmr: number;
  weight_lbs_used: number;
}

export type { Profile, WeightEntry, TodaySummary, CalculatedGoals };

export function useProfile() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [calorieGoal, setCalorieGoal] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [carbsGoal, setCarbsGoal] = useState("");
  const [fatGoal, setFatGoal] = useState("");

  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<"M" | "F" | "">("");
  const [heightFt, setHeightFt] = useState<string>("");
  const [heightIn, setHeightIn] = useState<string>("");
  const [heightUnit, setHeightUnit] = useState<"imperial" | "metric">("imperial");
  const [heightCm, setHeightCm] = useState<string>("");
  const [surveyWeight, setSurveyWeight] = useState<string>("");
  const [activityLevel, setActivityLevel] = useState<string>("");
  const [goalType, setGoalType] = useState<"lose" | "maintain" | "gain">(() => {
    return (safeGetItem('goalType') as 'lose' | 'maintain' | 'gain') ?? 'maintain';
  });
  const [surveyMode, setSurveyMode] = useState(false);
  const [surveyStep, setSurveyStep] = useState(0);
  const [calculatedGoals, setCalculatedGoals] = useState<CalculatedGoals | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [usedDefaultWeight, setUsedDefaultWeight] = useState(false);

  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);

  const [weightInput, setWeightInput] = useState("");
  const [loggingWeight, setLoggingWeight] = useState(false);
  const [weightError, setWeightError] = useState("");
  const [weightSuccess, setWeightSuccess] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [weightHistoryError, setWeightHistoryError] = useState("");
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>(() => {
    return (safeGetItem('weightUnit') as 'lbs' | 'kg') ?? 'lbs';
  });

  const [goalWeight, setGoalWeight] = useState<string>("");
  const [savingGoalWeight, setSavingGoalWeight] = useState(false);
  const [goalWeightError, setGoalWeightError] = useState("");
  const [goalWeightSuccess, setGoalWeightSuccess] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");

  const handleUnauthorized = () => {
    router.push("/login");
  };

  const parseApiError = (detail: any): string => {
    if (!detail) return "An error occurred.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg ?? String(d)).join(", ");
    return String(detail);
  };

  const toggleWeightUnit = (unit: 'lbs' | 'kg') => {
    setWeightUnit(unit);
    safeSetItem('weightUnit', unit);
  };

  const loadProfile = async () => {
    try {
      const res = await apiFetch("/profile");
      const data: Profile = await res.json().catch(() => ({} as Profile));
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
        setHeightCm(String(Math.round(data.height_cm)));
      }
      if (data.activity_level) setActivityLevel(data.activity_level);
      if (data.goal_type) setGoalType(data.goal_type as 'lose' | 'maintain' | 'gain');
      if (data.goal_weight_lbs) setGoalWeight(String(data.goal_weight_lbs));
      const profileComplete = !!(data.age && data.sex && data.height_cm && data.activity_level);
      setSurveyMode(!profileComplete);
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      // non-fatal
    }
  };

  const loadWeightHistory = async () => {
    try {
      const res = await apiFetch("/weight/history");
      if (!res.ok) { setWeightHistoryError("Failed to load weight history."); return; }
      const data = await res.json().catch(() => ({ entries: [] }));
      setWeightHistory((data.entries || []).slice().reverse());
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setWeightHistoryError("Network error loading weight history.");
    }
  };

  const loadTodaySummary = async () => {
    try {
      const tzOffset = getTzOffsetMinutes();
      const summaryRes = await apiFetch(`/summary/today?tz_offset_minutes=${tzOffset}`);
      if (summaryRes.ok) setTodaySummary(await summaryRes.json().catch(() => null));
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      // non-fatal
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    Promise.all([loadProfile(), loadWeightHistory(), loadTodaySummary()]).finally(() => setLoading(false));
  }, []);

  const handleCalculateGoals = async () => {
    setCalcError("");
    const computedHeightCm = heightUnit === "metric"
      ? parseFloat(heightCm) || 0
      : heightFt ? ((parseInt(heightFt) * 12 + parseInt(heightIn || "0")) * 2.54) : 0;
    if (!age || !sex || !activityLevel) {
      setCalcError("Please fill in all fields above.");
      return;
    }
    if (heightUnit === "imperial" && !heightFt) {
      setCalcError("Please fill in all fields above.");
      return;
    }
    if (heightUnit === "metric" && !heightCm) {
      setCalcError("Please fill in all fields above.");
      return;
    }
    safeSetItem('goalType', goalType);
    setCalculating(true);
    try {
      if (surveyWeight) {
        const wLbs = weightUnit === 'kg'
          ? parseFloat(surveyWeight) * 2.20462
          : parseFloat(surveyWeight);
        if (wLbs > 0) {
          const weightRes = await apiFetch("/weight", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weight_lbs: Math.round(wLbs * 10) / 10 }),
          });
          if (!weightRes.ok) {
            console.error("Failed to save weight:", await weightRes.text());
          }
          loadWeightHistory();
        }
      }
      const res = await apiFetch("/profile/calculate-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: parseInt(age),
          sex,
          height_cm: Math.round(computedHeightCm * 10) / 10,
          activity_level: activityLevel,
          goal_type: goalType,
        }),
      });
      if (res.ok) {
        const goals = await res.json();
        setCalculatedGoals(goals);
        if (goals.weight_lbs_used === 154 && !surveyWeight) setUsedDefaultWeight(true);
        setCalorieGoal(String(goals.calorie_goal));
        setProteinGoal(String(goals.protein_goal));
        setCarbsGoal(String(goals.carbs_goal));
        setFatGoal(String(goals.fat_goal));
        setSurveyMode(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setCalcError(err.detail || "Calculation failed. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
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
      const res = await apiFetch("/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight_lbs: lbs }),
      });
      if (res.ok) {
        setWeightInput("");
        setWeightSuccess(true);
        loadWeightHistory();
        setTimeout(() => setWeightSuccess(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setWeightError(parseApiError(err.detail) || "Failed to log weight.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setWeightError("Connection failed. Please try again.");
    } finally {
      setLoggingWeight(false);
    }
  };

  const handleSaveGoalWeight = async () => {
    const val = parseFloat(goalWeight);
    if (!goalWeight || isNaN(val)) return;
    const lbs = weightUnit === 'kg' ? parseFloat((val * 2.20462).toFixed(1)) : val;
    if (lbs < 50 || lbs > 700) {
      setGoalWeightError("Goal weight must be between 50 and 700 lbs.");
      return;
    }
    setGoalWeightError("");
    setGoalWeightSuccess(false);
    setSavingGoalWeight(true);
    try {
      const res = await apiFetch("/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_weight_lbs: lbs }),
      });
      if (res.ok) {
        setGoalWeightSuccess(true);
        setProfile((prev) => prev ? { ...prev, goal_weight_lbs: lbs } : prev);
        setTimeout(() => setGoalWeightSuccess(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setGoalWeightError(parseApiError(err.detail) || "Failed to save goal weight.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setGoalWeightError("Connection failed. Please try again.");
    } finally {
      setSavingGoalWeight(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteAccountError("");
    setDeletingAccount(true);
    try {
      const res = await apiFetch("/auth/account", { method: "DELETE" });
      if (res.ok) {
        removeToken();
        router.push("/login");
      } else {
        const err = await res.json().catch(() => ({}));
        setDeleteAccountError(err.detail || "Failed to delete account. Please try again.");
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setDeleteAccountError("Connection failed. Please try again.");
      setShowDeleteConfirm(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  const displayWeight = (lbs: number) =>
    weightUnit === 'kg' ? (lbs / 2.20462).toFixed(1) : lbs.toString();

  const unitLabel = weightUnit === 'kg' ? 'kg' : 'lb';

  return {
    profile,
    loading,
    calorieGoal,
    proteinGoal,
    carbsGoal,
    fatGoal,
    age,
    setAge,
    sex,
    setSex,
    heightFt,
    setHeightFt,
    heightIn,
    setHeightIn,
    heightUnit,
    setHeightUnit,
    heightCm,
    setHeightCm,
    surveyWeight,
    setSurveyWeight,
    activityLevel,
    setActivityLevel,
    goalType,
    setGoalType,
    surveyMode,
    setSurveyMode,
    surveyStep,
    setSurveyStep,
    calculatedGoals,
    setCalculatedGoals,
    calculating,
    calcError,
    usedDefaultWeight,
    todaySummary,
    weightInput,
    setWeightInput,
    loggingWeight,
    weightError,
    weightSuccess,
    weightHistory,
    weightHistoryError,
    weightUnit,
    toggleWeightUnit,
    showDeleteConfirm,
    setShowDeleteConfirm,
    deletingAccount,
    deleteAccountError,
    setDeleteAccountError,
    handleCalculateGoals,
    handleLogWeight,
    goalWeight,
    setGoalWeight,
    savingGoalWeight,
    goalWeightError,
    goalWeightSuccess,
    handleSaveGoalWeight,
    handleDeleteAccount,
    displayWeight,
    unitLabel,
  };
}
