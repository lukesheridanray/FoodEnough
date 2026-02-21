"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, authHeaders } from "../../lib/auth";
import { API_URL } from "../../lib/config";

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

interface TodaySummary {
  calories_today: number;
  protein_today: number;
  carbs_today: number;
  fat_today: number;
  calorie_goal: number | null;
  protein_goal: number | null;
  carbs_goal: number | null;
  fat_goal: number | null;
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
  const [surveyWeight, setSurveyWeight] = useState<string>("");
  const [activityLevel, setActivityLevel] = useState<string>("");
  const [goalType, setGoalType] = useState<"lose" | "maintain" | "gain">(() => {
    if (typeof window === 'undefined') return 'maintain';
    return (localStorage.getItem('goalType') as 'lose' | 'maintain' | 'gain') ?? 'maintain';
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
    if (typeof window === 'undefined') return 'lbs';
    return (localStorage.getItem('weightUnit') as 'lbs' | 'kg') ?? 'lbs';
  });

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

  const toggleWeightUnit = (unit: 'lbs' | 'kg') => {
    setWeightUnit(unit);
    localStorage.setItem('weightUnit', unit);
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
        { headers: authHeaders() }
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
        setCalorieGoal(String(goals.calorie_goal));
        setProteinGoal(String(goals.protein_goal));
        setCarbsGoal(String(goals.carbs_goal));
        setFatGoal(String(goals.fat_goal));
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
    handleDeleteAccount,
    displayWeight,
    unitLabel,
  };
}
