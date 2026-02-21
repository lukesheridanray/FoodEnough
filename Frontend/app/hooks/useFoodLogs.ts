"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, authHeaders } from "../../lib/auth";
import { API_URL } from "../../lib/config";

interface Summary {
  calories_today: number;
  calorie_goal: number | null;
  calories_remaining: number | null;
  latest_weight_lbs: number | null;
  latest_workout_name: string | null;
  protein_today: number;
  carbs_today: number;
  fat_today: number;
  protein_goal: number | null;
  carbs_goal: number | null;
  fat_goal: number | null;
}

interface ImageItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ImageAnalysis {
  description: string;
  items: ImageItem[];
  total: { calories: number; protein: number; carbs: number; fat: number };
}

interface BarcodeResult {
  description: string;
  items: ImageItem[];
  total: { calories: number; protein: number; carbs: number; fat: number; fiber?: number | null; sugar?: number | null; sodium?: number | null };
}

interface Log {
  id: number;
  input_text: string;
  timestamp: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
}

export type { Summary, ImageItem, ImageAnalysis, BarcodeResult, Log };

export function useFoodLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const router = useRouter();

  const handleUnauthorized = () => {
    removeToken();
    router.push("/login");
  };

  const loadLogs = async () => {
    try {
      const tzOffset = -new Date().getTimezoneOffset();
      const res = await fetch(`${API_URL}/logs/today?tz_offset_minutes=${tzOffset}`, { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  const loadSummary = async () => {
    try {
      const tzOffset = -new Date().getTimezoneOffset();
      const res = await fetch(`${API_URL}/summary/today?tz_offset_minutes=${tzOffset}`, { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) setSummary(await res.json());
    } catch {
      // non-fatal
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    loadLogs();
    loadSummary();
  }, []);

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_URL}/logs/export`, { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "food_logs.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleEditSave = async (logId: number) => {
    if (!editText.trim()) return;
    setEditError("");
    setEditLoading(true);
    try {
      const res = await fetch(`${API_URL}/logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ input_text: editText }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        setEditingId(null);
        setEditText("");
        setEditError("");
        loadLogs();
        loadSummary();
      } else {
        const err = await res.json().catch(() => ({}));
        setEditError(err.detail || "Failed to save. Please try again.");
      }
    } catch {
      setEditError("Connection failed. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (logId: number) => {
    const res = await fetch(`${API_URL}/logs/${logId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (res.ok) { setDeleteConfirmId(null); loadLogs(); loadSummary(); }
  };

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  return {
    logs,
    summary,
    summaryLoading,
    deleteConfirmId,
    setDeleteConfirmId,
    editingId,
    setEditingId,
    editText,
    setEditText,
    editLoading,
    editError,
    setEditError,
    loadLogs,
    loadSummary,
    handleExport,
    handleEditSave,
    handleDelete,
    handleLogout,
    handleUnauthorized,
  };
}
