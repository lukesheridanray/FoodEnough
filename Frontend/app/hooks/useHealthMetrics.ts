"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getTzOffsetMinutes } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";

export interface HealthMetricData {
  date: string;
  total_expenditure: number | null;
  active_calories: number | null;
  resting_calories: number | null;
  steps: number | null;
  source: string | null;
}

export function useHealthMetrics() {
  const router = useRouter();
  const [todayMetric, setTodayMetric] = useState<HealthMetricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUnauthorized = () => {
    router.push("/login");
  };

  const loadToday = async () => {
    try {
      const tz = getTzOffsetMinutes();
      const res = await apiFetch(`/health/today?tz_offset_minutes=${tz}`);
      if (res.ok) {
        setTodayMetric(await res.json());
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

  const saveDaily = async (data: {
    total_expenditure?: number;
    active_calories?: number;
    steps?: number;
  }) => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const tz = getTzOffsetMinutes();
      const res = await apiFetch(`/health/daily?tz_offset_minutes=${tz}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        await loadToday();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.detail || "Failed to save. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleUnauthorized();
        return;
      }
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    loadToday();
  }, []);

  return {
    todayMetric,
    loading,
    saving,
    saveError,
    saveSuccess,
    loadToday,
    saveDaily,
  };
}
