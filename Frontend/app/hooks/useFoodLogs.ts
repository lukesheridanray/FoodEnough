"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, getTzOffsetMinutes } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";

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
  ani_active?: boolean;
  ani_calorie_goal?: number | null;
  ani_protein_goal?: number | null;
  ani_carbs_goal?: number | null;
  ani_fat_goal?: number | null;
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

interface LogItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
  meal_type?: string | null;
  parsed_json?: string | null;
  items?: LogItem[];
}

interface Favorite {
  input_text: string;
  count: number;
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
}

export type { Summary, ImageItem, ImageAnalysis, BarcodeResult, Log, Favorite };

export function useFoodLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [deleteError, setDeleteError] = useState("");
  const [exportError, setExportError] = useState("");
  const router = useRouter();

  const handleUnauthorized = () => {
    router.push("/login");
  };

  const loadLogs = async () => {
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/logs/today?tz_offset_minutes=${tzOffset}`);
      const data = await res.json().catch(() => ({ logs: [] }));
      const logsWithItems = (data.logs || []).map((log: Log) => {
        if (log.parsed_json) {
          try {
            const parsed = typeof log.parsed_json === "string" ? JSON.parse(log.parsed_json) : log.parsed_json;
            log.items = parsed?.items ?? [];
          } catch {
            log.items = [];
          }
        }
        return log;
      });
      setLogs(logsWithItems);
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      console.error("Error loading logs:", err);
    }
  };

  const loadSummary = async () => {
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/summary/today?tz_offset_minutes=${tzOffset}`);
      if (res.ok) setSummary(await res.json().catch(() => null));
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      // non-fatal
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const res = await apiFetch("/logs/favorites");
      if (res.ok) {
        const data = await res.json().catch(() => ({ favorites: [] }));
        setFavorites(data.favorites || []);
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      // non-fatal
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    Promise.all([loadLogs(), loadSummary(), loadFavorites()]);
  }, []);

  const handleExport = async () => {
    setExportError("");
    try {
      const res = await apiFetch("/logs/export");
      if (!res.ok) {
        setExportError("Export failed. Please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "food_logs.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setExportError("Export failed. Please check your connection and try again.");
    }
  };

  const handleEditSave = async (logId: number) => {
    if (!editText.trim()) return;
    setEditError("");
    setEditLoading(true);
    try {
      const res = await apiFetch(`/logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_text: editText }),
      });
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
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setEditError("Connection failed. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (logId: number) => {
    setDeleteError("");
    try {
      const res = await apiFetch(`/logs/${logId}`, { method: "DELETE" });
      if (res.ok) { setDeleteConfirmId(null); loadLogs(); loadSummary(); }
      else { setDeleteError("Failed to delete. Please try again."); }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setDeleteError("Connection failed. Please try again.");
    }
  };

  const handleQuickAdd = async (fav: Favorite) => {
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/logs/save-parsed?tz_offset_minutes=${tzOffset}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_text: fav.input_text,
          calories: Math.round(fav.avg_calories),
          protein: Math.round(fav.avg_protein),
          carbs: Math.round(fav.avg_carbs),
          fat: Math.round(fav.avg_fat),
          fiber: null,
          sugar: null,
          sodium: null,
          parsed_json: null,
        }),
      });
      if (res.ok) {
        loadLogs();
        loadSummary();
        loadFavorites();
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
    }
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
    favorites,
    deleteError,
    setDeleteError,
    exportError,
    loadLogs,
    loadSummary,
    loadFavorites,
    handleExport,
    handleEditSave,
    handleDelete,
    handleQuickAdd,
    handleLogout,
    handleUnauthorized,
  };
}
