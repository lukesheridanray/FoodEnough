"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";

interface ANITargets {
  ani_active: boolean;
  calorie_goal?: number;
  protein_goal?: number;
  carbs_goal?: number;
  fat_goal?: number;
  reasoning?: string;
  days_until_next: number;
  last_recalibrated?: string;
}

interface RecalibrationGoals {
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
}

interface RecalibrationRecord {
  id: number;
  created_at: string;
  period_start: string;
  period_end: string;
  prev_goals: RecalibrationGoals;
  new_goals: RecalibrationGoals;
  reasoning: string;
}

interface Insight {
  id: number;
  type: string; // pattern, achievement, warning, tip
  title: string;
  body: string;
  created_at: string;
}

export type { ANITargets, RecalibrationRecord, Insight };

export function useANI() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [targets, setTargets] = useState<ANITargets | null>(null);
  const [history, setHistory] = useState<RecalibrationRecord[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recalibrating, setRecalibrating] = useState(false);
  const [recalError, setRecalError] = useState("");

  const handleUnauthorized = () => {
    router.push("/login");
  };

  const loadTargets = async () => {
    try {
      const res = await apiFetch("/ani/targets");
      if (res.ok) {
        setTargets(await res.json());
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
    }
  };

  const loadHistory = async () => {
    try {
      const res = await apiFetch("/ani/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
    }
  };

  const loadInsights = async () => {
    try {
      const res = await apiFetch("/ani/insights");
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    const init = async () => {
      try {
        const profileRes = await apiFetch("/profile");
        if (!profileRes.ok) return;
        const profile = await profileRes.json();
        const premium = !!profile.is_premium;
        setIsPremium(premium);

        if (premium) {
          await Promise.all([loadTargets(), loadHistory(), loadInsights()]);
        }
      } catch (err) {
        if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const triggerRecalibration = async () => {
    setRecalibrating(true);
    setRecalError("");
    try {
      const res = await apiFetch("/ani/recalibrate", { method: "POST" });
      if (res.ok) {
        await Promise.all([loadTargets(), loadHistory(), loadInsights()]);
      } else {
        const err = await res.json().catch(() => ({}));
        setRecalError(err.detail || "Recalibration failed. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setRecalError("Connection failed. Please try again.");
    } finally {
      setRecalibrating(false);
    }
  };

  return {
    loading,
    isPremium,
    targets,
    history,
    insights,
    recalibrating,
    recalError,
    triggerRecalibration,
  };
}
