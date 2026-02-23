"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";

export interface TrendWeek {
  week: string;
  days_logged: number;
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
}

export interface ConsistencyData {
  score: number;
  logging_rate: number;
  macro_accuracy: number;
  days_logged: number;
  days_total: number;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  most_common_break_day: string | null;
  total_days_logged: number;
}

export interface CorrelationData {
  workout_days: { calories: number; protein: number; carbs: number; fat: number; days: number };
  rest_days: { calories: number; protein: number; carbs: number; fat: number; days: number };
  insights: string[];
}

export interface ProjectionData {
  current_weight: number;
  weekly_rate: number;
  avg_daily_expenditure: number | null;
  projections: { weeks: number; projected_weight: number }[];
  data_points: number;
}

export interface MealTimingEntry {
  meal_type: string;
  avg_calories: number;
  percentage: number;
  total_entries: number;
}

export interface WeekCompareData {
  week_a: WeekStats;
  week_b: WeekStats;
}

export interface WeekStats {
  offset: number;
  days_logged: number;
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
  total_entries: number;
}

export function useAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const [trends, setTrends] = useState<TrendWeek[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyData | null>(null);
  const [streaks, setStreaks] = useState<StreakData | null>(null);
  const [correlations, setCorrelations] = useState<CorrelationData | null>(null);
  const [projections, setProjections] = useState<ProjectionData | null>(null);
  const [mealTiming, setMealTiming] = useState<MealTimingEntry[]>([]);
  const [weekCompare, setWeekCompare] = useState<WeekCompareData | null>(null);
  const [weekAOffset, setWeekAOffset] = useState(0);
  const [weekBOffset, setWeekBOffset] = useState(1);

  const handleUnauthorized = () => {
    router.push("/login");
  };

  const loadAll = async () => {
    try {
      const [
        trendsRes,
        consistencyRes,
        streaksRes,
        correlationsRes,
        projectionsRes,
        mealTimingRes,
        compareRes,
      ] = await Promise.all([
        apiFetch("/analytics/trends?weeks=8"),
        apiFetch("/analytics/consistency?days=30"),
        apiFetch("/analytics/streaks"),
        apiFetch("/analytics/correlations?days=30"),
        apiFetch("/analytics/projections"),
        apiFetch("/analytics/meal-timing?days=30"),
        apiFetch(`/analytics/compare-weeks?week_a_offset=${weekAOffset}&week_b_offset=${weekBOffset}`),
      ]);

      if (trendsRes.ok) {
        const d = await trendsRes.json();
        setTrends(d.trends || []);
      }
      if (consistencyRes.ok) setConsistency(await consistencyRes.json());
      if (streaksRes.ok) setStreaks(await streaksRes.json());
      if (correlationsRes.ok) setCorrelations(await correlationsRes.json());
      if (projectionsRes.ok) {
        const d = await projectionsRes.json();
        setProjections(d.projections ? d : null);
      }
      if (mealTimingRes.ok) {
        const d = await mealTimingRes.json();
        setMealTiming(d.meal_timing || []);
      }
      if (compareRes.ok) setWeekCompare(await compareRes.json());
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleUnauthorized();
        return;
      }
    }
  };

  const reloadWeekCompare = async (aOffset: number, bOffset: number) => {
    setWeekAOffset(aOffset);
    setWeekBOffset(bOffset);
    try {
      const res = await apiFetch(`/analytics/compare-weeks?week_a_offset=${aOffset}&week_b_offset=${bOffset}`);
      if (res.ok) setWeekCompare(await res.json());
    } catch (err) {
      if (err instanceof UnauthorizedError) handleUnauthorized();
    }
  };

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    const init = async () => {
      try {
        const profileRes = await apiFetch("/profile");
        if (!profileRes.ok) return;
        const profile = await profileRes.json();
        const premium = !!profile.is_premium;
        setIsPremium(premium);
        if (premium) {
          await loadAll();
        }
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          handleUnauthorized();
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return {
    loading,
    isPremium,
    trends,
    consistency,
    streaks,
    correlations,
    projections,
    mealTiming,
    weekCompare,
    weekAOffset,
    weekBOffset,
    reloadWeekCompare,
  };
}
