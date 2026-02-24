"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
  ani_days_logged_7d?: number;
  ani_eligible?: boolean;
  goal_type?: "lose" | "maintain" | "gain";
  active_calories_today?: number;
  burn_log_count_today?: number;
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

interface LogEditFields {
  input_text?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  meal_type?: string;
  date?: string;
}

export type { Summary, ImageItem, ImageAnalysis, BarcodeResult, Log, Favorite, LogEditFields };

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  const [selectedDate, setSelectedDate] = useState<string>(toDateString(new Date()));
  const router = useRouter();

  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const isToday = selectedDate === toDateString(new Date());

  const handleUnauthorized = () => {
    router.push("/login");
  };

  const loadLogs = useCallback(async () => {
    try {
      const tzOffset = getTzOffsetMinutes();
      const dateParam = `&date=${selectedDateRef.current}`;
      const res = await apiFetch(`/logs/today?tz_offset_minutes=${tzOffset}${dateParam}`);
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
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const tzOffset = getTzOffsetMinutes();
      const dateParam = `&date=${selectedDateRef.current}`;
      const res = await apiFetch(`/summary/today?tz_offset_minutes=${tzOffset}${dateParam}`);
      if (res.ok) setSummary(await res.json().catch(() => null));
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      // non-fatal
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    Promise.all([loadLogs(), loadSummary(), loadFavorites()]);
  }, []);

  // Reload logs and summary when selected date changes
  useEffect(() => {
    setSummaryLoading(true);
    loadLogs();
    loadSummary();
  }, [selectedDate]);

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

  const handleDirectEdit = async (logId: number, fields: LogEditFields): Promise<boolean> => {
    setEditError("");
    setEditLoading(true);
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/logs/${logId}?tz_offset_minutes=${tzOffset}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        setEditingId(null);
        loadLogs();
        loadSummary();
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        setEditError(err.detail || "Failed to save. Please try again.");
        return false;
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return false; }
      setEditError("Connection failed. Please try again.");
      return false;
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

  const handleMoveMeal = async (logId: number, mealType: string) => {
    try {
      const res = await apiFetch(`/logs/${logId}/meal-type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal_type: mealType }),
      });
      if (res.ok) {
        loadLogs();
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
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
    selectedDate,
    setSelectedDate,
    isToday,
    loadLogs,
    loadSummary,
    loadFavorites,
    handleExport,
    handleEditSave,
    handleDirectEdit,
    handleDelete,
    handleMoveMeal,
    handleQuickAdd,
    handleLogout,
    handleUnauthorized,
  };
}
