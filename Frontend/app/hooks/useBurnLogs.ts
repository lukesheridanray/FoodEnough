"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, getTzOffsetMinutes } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";

export interface BurnLog {
  id: number;
  timestamp: string;
  workout_type: string;
  duration_minutes: number | null;
  calories_burned: number;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  source: string;
  external_id: string | null;
  plan_session_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BurnLogCreateInput {
  workout_type: string;
  duration_minutes?: number;
  calories_burned: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  notes?: string;
}

export function useBurnLogs() {
  const [burnLogs, setBurnLogs] = useState<BurnLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [createError, setCreateError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const router = useRouter();

  const handleUnauthorized = () => {
    router.push("/login");
  };

  const loadBurnLogs = useCallback(async () => {
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/burn-logs/today?tz_offset_minutes=${tzOffset}`);
      if (res.ok) {
        const data = await res.json();
        setBurnLogs(data.burn_logs || []);
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
    } finally {
      setLoading(false);
    }
  }, []);

  const createBurnLog = async (input: BurnLogCreateInput): Promise<boolean> => {
    setCreateError("");
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/burn-logs?tz_offset_minutes=${tzOffset}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        await loadBurnLogs();
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.detail || "Failed to save burn log.");
        return false;
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return false; }
      setCreateError("Network error. Please try again.");
      return false;
    }
  };

  const deleteBurnLog = async (id: number): Promise<boolean> => {
    setDeleteError("");
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/burn-logs/${id}?tz_offset_minutes=${tzOffset}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadBurnLogs();
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        setDeleteError(err.detail || "Failed to delete.");
        return false;
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return false; }
      setDeleteError("Network error. Please try again.");
      return false;
    }
  };

  useEffect(() => {
    if (!getToken()) return;
    loadBurnLogs();
  }, [loadBurnLogs]);

  return {
    burnLogs,
    loading,
    createError,
    setCreateError,
    deleteError,
    setDeleteError,
    loadBurnLogs,
    createBurnLog,
    deleteBurnLog,
  };
}
