"use client";
import { useState, useEffect, useRef } from "react";
import { LogOut, X, Camera, Loader2, ScanBarcode, Pencil, MessageSquare, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, authHeaders } from "../lib/auth";
import BottomNav from "./components/BottomNav";
import BarcodeScanner from "./components/BarcodeScanner";
import { API_URL } from "../lib/config";

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

export default function FoodEnoughApp() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [mealError, setMealError] = useState("");
  const [mealSuccess, setMealSuccess] = useState(false);
  const [logging, setLogging] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [saveImageError, setSaveImageError] = useState("");
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null);
  const [barcodeError, setBarcodeError] = useState("");
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [saveBarcodeError, setSaveBarcodeError] = useState("");
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [inputTab, setInputTab] = useState<"text" | "photo" | "barcode" | "manual">("text");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualFiber, setManualFiber] = useState("");
  const [manualSugar, setManualSugar] = useState("");
  const [manualSodium, setManualSodium] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState(false);
  const [showManualAdvanced, setShowManualAdvanced] = useState(false);
  const mealInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  const clearBarcode = () => {
    setBarcodeResult(null);
    setBarcodeError("");
    setSaveBarcodeError("");
    setLookingUpBarcode(false);
  };

  const lookupBarcode = async (code: string) => {
    setLookingUpBarcode(true);
    setBarcodeError("");
    setBarcodeResult(null);
    setSaveBarcodeError("");
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`
      );
      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        setBarcodeError("Product not found in database.");
        return;
      }
      const p = data.product;
      const n = p.nutriments ?? {};
      const servingQty: number | null =
        p.serving_quantity ? parseFloat(p.serving_quantity) : null;
      const factor = servingQty ? servingQty / 100 : 1;
      const label = servingQty ? `1 serving (${servingQty}g)` : "per 100g";

      const calories = Math.round((n["energy-kcal_100g"] ?? 0) * factor);
      const protein  = Math.round((n["proteins_100g"] ?? 0) * factor * 10) / 10;
      const carbs    = Math.round((n["carbohydrates_100g"] ?? 0) * factor * 10) / 10;
      const fat      = Math.round((n["fat_100g"] ?? 0) * factor * 10) / 10;
      const fiber    = n["fiber_100g"] != null ? Math.round((n["fiber_100g"] as number) * factor * 10) / 10 : null;
      const sugar    = n["sugars_100g"] != null ? Math.round((n["sugars_100g"] as number) * factor * 10) / 10 : null;
      const sodium   = n["sodium_100g"] != null ? Math.round((n["sodium_100g"] as number) * 1000 * factor) : null; // g→mg
      const name     = p.product_name || p.product_name_en || "Unknown product";

      setBarcodeResult({
        description: name,
        items: [{ name: label, calories, protein, carbs, fat }],
        total: { calories, protein, carbs, fat, fiber, sugar, sodium },
      });
    } catch {
      setBarcodeError("Network error looking up barcode.");
    } finally {
      setLookingUpBarcode(false);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setBarcodeScannerOpen(false);
    lookupBarcode(code);
  };

  const handleBarcodeSave = async () => {
    if (!barcodeResult) return;
    setSaveBarcodeError("");
    setSavingBarcode(true);
    try {
      const res = await fetch(`${API_URL}/logs/save-parsed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          input_text: `🔍 ${barcodeResult.description}`,
          calories: barcodeResult.total.calories,
          protein: barcodeResult.total.protein,
          carbs: barcodeResult.total.carbs,
          fat: barcodeResult.total.fat,
          fiber: barcodeResult.total.fiber ?? null,
          sugar: barcodeResult.total.sugar ?? null,
          sodium: barcodeResult.total.sodium ?? null,
          parsed_json: JSON.stringify({
            description: barcodeResult.description,
            items: barcodeResult.items,
            total: barcodeResult.total,
          }),
        }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        clearBarcode();
        loadLogs();
        loadSummary();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveBarcodeError(err.detail || "Failed to save. Please try again.");
      }
    } catch {
      setSaveBarcodeError("Network error. Is the backend running?");
    } finally {
      setSavingBarcode(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualName.trim()) { setManualError("Food name is required."); return; }
    const _cal = parseFloat(manualCalories) || 0;
    const _pro = parseFloat(manualProtein) || 0;
    const _carb = parseFloat(manualCarbs) || 0;
    const _fat = parseFloat(manualFat) || 0;
    const _fiber = manualFiber ? parseFloat(manualFiber) : null;
    const _sugar = manualSugar ? parseFloat(manualSugar) : null;
    const _sodium = manualSodium ? parseFloat(manualSodium) : null;
    if ([_cal, _pro, _carb, _fat].some((v) => v < 0) ||
        [_fiber, _sugar, _sodium].some((v) => v != null && v < 0)) {
      setManualError("Nutrient values cannot be negative.");
      return;
    }
    setManualError("");
    setManualLoading(true);
    try {
      const res = await fetch(`${API_URL}/logs/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: manualName.trim(),
          calories: _cal,
          protein: _pro,
          carbs: _carb,
          fat: _fat,
          fiber: _fiber,
          sugar: _sugar,
          sodium: _sodium,
        }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        setManualName(""); setManualCalories(""); setManualProtein("");
        setManualCarbs(""); setManualFat(""); setManualFiber("");
        setManualSugar(""); setManualSodium(""); setShowManualAdvanced(false);
        loadLogs();
        loadSummary();
        setManualSuccess(true);
        setTimeout(() => setManualSuccess(false), 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        setManualError(err.detail || "Failed to save. Please try again.");
      }
    } catch {
      setManualError("Connection failed. Please try again.");
    } finally {
      setManualLoading(false);
    }
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setAnalysisError("");
    setImageAnalysis(null);
    setSaveImageError("");
  };

  const analyzeImage = async (file: File) => {
    setAnalyzingImage(true);
    setAnalysisError("");
    setImageAnalysis(null);
    setSaveImageError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_URL}/parse_log/image`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        setImageAnalysis(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setAnalysisError(err.detail || "Failed to analyze photo. Please try again.");
      }
    } catch {
      setAnalysisError("Network error. Is the backend running?");
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAnalysisError("Image must be under 5 MB. Please choose a smaller file.");
      e.target.value = "";
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
    analyzeImage(file);
  };

  const handleImageSave = async () => {
    if (!imageAnalysis) return;
    setSaveImageError("");
    setSavingImage(true);
    try {
      const res = await fetch(`${API_URL}/logs/save-parsed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          input_text: `📷 ${imageAnalysis.description}`,
          calories: imageAnalysis.total.calories,
          protein: imageAnalysis.total.protein,
          carbs: imageAnalysis.total.carbs,
          fat: imageAnalysis.total.fat,
          fiber: null,
          sugar: null,
          sodium: null,
          parsed_json: JSON.stringify({
            description: imageAnalysis.description,
            items: imageAnalysis.items,
            total: imageAnalysis.total,
          }),
        }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        clearImage();
        loadLogs();
        loadSummary();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveImageError(err.detail || "Failed to save. Please try again.");
      }
    } catch {
      setSaveImageError("Network error. Is the backend running?");
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex flex-col">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3">
        <span className="text-green-800 font-medium text-lg">🌿 FoodEnough</span>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} title="Log out">
            <LogOut className="w-5 h-5 text-green-700" />
          </button>
        </div>
      </header>

      {/* Today's Summary Hero */}
      <section className="px-5 mt-2">
        {summaryLoading ? (
          <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
            <div className="h-12 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
          </div>
        ) : summary ? (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            {/* Calorie hero */}
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                  {summary.calorie_goal
                    ? (summary.calories_remaining != null && summary.calories_remaining < 0 ? "Over Goal" : "Calories Remaining")
                    : "Calories Today"}
                </p>
                {(() => {
                  const displayVal = summary.calorie_goal
                    ? (summary.calories_remaining ?? summary.calories_today)
                    : summary.calories_today;
                  const isOver = summary.calorie_goal && summary.calories_remaining != null && summary.calories_remaining < 0;
                  return (
                    <p className={`text-5xl font-bold leading-none ${isOver ? "text-red-500" : "text-green-700"}`}>
                      {isOver ? `+${Math.abs(displayVal)}` : displayVal}
                    </p>
                  );
                })()}
                {summary.calorie_goal && (
                  <p className="text-sm text-gray-400 mt-1">
                    of {summary.calorie_goal} kcal goal
                  </p>
                )}
              </div>
              {/* Quick stats column */}
              <div className="text-right space-y-2">
                <div className="text-xs">
                  <span className="text-gray-400">Weight </span>
                  <span className="font-semibold text-gray-700">
                    {summary.latest_weight_lbs ? `${summary.latest_weight_lbs} lb` : "—"}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-gray-400">Workout </span>
                  <span className="font-semibold text-gray-700 max-w-[100px] inline-block truncate align-bottom">
                    {summary.latest_workout_name ?? "None yet"}
                  </span>
                </div>
              </div>
            </div>

            {/* Calorie progress bar */}
            {summary.calorie_goal && (
              <div className="mb-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((summary.calories_today / summary.calorie_goal) * 100))}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {summary.calories_today} / {summary.calorie_goal} kcal eaten
                </p>
              </div>
            )}

            {/* Macro bars */}
            {(summary.protein_goal || summary.carbs_goal || summary.fat_goal ||
              summary.protein_today > 0 || summary.carbs_today > 0 || summary.fat_today > 0) && (
              <div className="flex gap-2">
                {[
                  { label: "Protein", value: summary.protein_today, goal: summary.protein_goal, barColor: "bg-blue-500", textColor: "text-blue-600" },
                  { label: "Carbs", value: summary.carbs_today, goal: summary.carbs_goal, barColor: "bg-amber-500", textColor: "text-amber-600" },
                  { label: "Fat", value: summary.fat_today, goal: summary.fat_goal, barColor: "bg-orange-500", textColor: "text-orange-600" },
                ].map((macro) => (
                  <div key={macro.label} className="flex-1">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-xs text-gray-400">{macro.label}</span>
                      <span className={`text-xs font-semibold ${macro.textColor}`}>{macro.value}g</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${macro.barColor} rounded-full`}
                        style={{
                          width: macro.goal
                            ? `${Math.min(100, Math.round((macro.value / macro.goal) * 100))}%`
                            : macro.value > 0 ? "100%" : "0%"
                        }}
                      />
                    </div>
                    {macro.goal && (
                      <p className="text-xs text-gray-400 mt-0.5">/ {macro.goal}g</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center text-gray-400 text-sm">
            Could not load summary.
          </div>
        )}
      </section>

      {/* Add Meal */}
      <section className="px-5 mt-4">
        <h2 className="text-lg font-bold text-green-900 mb-2">Add Meal</h2>

        {/* Tab switcher */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {([
            { key: "text",    Icon: MessageSquare, label: "Describe" },
            { key: "photo",   Icon: Camera,        label: "Photo"    },
            { key: "barcode", Icon: ScanBarcode,   label: "Barcode"  },
            { key: "manual",  Icon: PenLine,       label: "Manual"   },
          ] as const).map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setInputTab(key)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${
                inputTab === key
                  ? "bg-green-500 text-white shadow-md scale-[1.03]"
                  : "bg-white text-gray-400 shadow-sm hover:text-green-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>

        {/* Text tab */}
        {inputTab === "text" && (
          <div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const input = mealInputRef.current?.value ?? "";
              if (!input.trim()) return;
              setMealError("");
              setLogging(true);
              try {
                const res = await fetch(`${API_URL}/save_log`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...authHeaders() },
                  body: JSON.stringify({ input_text: input }),
                });
                if (res.status === 401) { handleUnauthorized(); return; }
                if (res.ok) {
                  if (mealInputRef.current) mealInputRef.current.value = "";
                  loadLogs();
                  loadSummary();
                  setMealSuccess(true);
                  setTimeout(() => setMealSuccess(false), 2000);
                } else {
                  setMealError("Failed to log meal. Please try again.");
                }
              } catch (err) {
                console.error("Error saving meal:", err);
                setMealError("Connection failed. Please try again.");
              } finally {
                setLogging(false);
              }
            }}
            className="flex gap-2 items-center"
          >
            <input
              ref={mealInputRef}
              name="meal"
              placeholder="e.g. chicken rice and broccoli"
              className="flex-1 border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={logging}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {logging ? "Logging…" : "Log"}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-1.5">
            Packaged product? Use{" "}
            <button
              onClick={() => setInputTab("barcode")}
              className="text-green-600 font-medium underline-offset-2 hover:underline"
            >
              Barcode
            </button>
            {" "}for exact label data.
          </p>
          </div>
        )}

        {/* Photo tab */}
        {inputTab === "photo" && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageSelect}
            />
            {!imagePreview && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-green-300 rounded-2xl text-center hover:bg-green-50 transition-colors"
              >
                <Camera className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Tap to choose a photo</p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP up to 5 MB</p>
              </button>
            )}
            {imagePreview && (
              <div className="bg-white rounded-2xl p-3 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Food preview"
                    className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{imageFile?.name}</p>
                    {analyzingImage && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> Analyzing photo…
                      </p>
                    )}
                    {!analyzingImage && imageAnalysis && (
                      <p className="text-xs text-green-600 mt-0.5">{imageAnalysis.description}</p>
                    )}
                  </div>
                  <button
                    onClick={clearImage}
                    disabled={savingImage}
                    className="text-gray-300 hover:text-gray-500 flex-shrink-0"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {analysisError && (
                  <div className="space-y-1">
                    <p className="text-red-500 text-xs">{analysisError}</p>
                    <button
                      onClick={() => imageFile && analyzeImage(imageFile)}
                      className="text-xs text-green-600 underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {imageAnalysis && imageAnalysis.items.length > 0 && (
                  <div className="rounded-xl overflow-hidden border border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-medium">Item</th>
                          <th className="text-right px-2 py-1.5 font-medium">kcal</th>
                          <th className="text-right px-2 py-1.5 font-medium text-blue-500">P</th>
                          <th className="text-right px-2 py-1.5 font-medium text-amber-500">C</th>
                          <th className="text-right px-2 py-1.5 font-medium text-orange-500">F</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {imageAnalysis.items.map((item, i) => (
                          <tr key={i + item.name} className="text-gray-700">
                            <td className="px-3 py-1.5 capitalize">{item.name}</td>
                            <td className="text-right px-2 py-1.5">{item.calories}</td>
                            <td className="text-right px-2 py-1.5">{item.protein}g</td>
                            <td className="text-right px-2 py-1.5">{item.carbs}g</td>
                            <td className="text-right px-2 py-1.5">{item.fat}g</td>
                          </tr>
                        ))}
                        <tr className="bg-green-50 font-semibold text-green-800">
                          <td className="px-3 py-1.5">Total</td>
                          <td className="text-right px-2 py-1.5">{imageAnalysis.total.calories}</td>
                          <td className="text-right px-2 py-1.5">{imageAnalysis.total.protein}g</td>
                          <td className="text-right px-2 py-1.5">{imageAnalysis.total.carbs}g</td>
                          <td className="text-right px-2 py-1.5">{imageAnalysis.total.fat}g</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {saveImageError && <p className="text-red-500 text-xs">{saveImageError}</p>}
                {imageAnalysis && (
                  <button
                    onClick={handleImageSave}
                    disabled={savingImage}
                    className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-medium rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {savingImage ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                    ) : (
                      "Save Log →"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Barcode tab */}
        {inputTab === "barcode" && (
          <div>
            {!barcodeResult && !lookingUpBarcode && !barcodeError && (
              <button
                onClick={() => { clearBarcode(); setBarcodeScannerOpen(true); }}
                className="w-full py-8 border-2 border-dashed border-green-300 rounded-2xl text-center hover:bg-green-50 transition-colors"
              >
                <ScanBarcode className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Tap to scan a barcode</p>
                <p className="text-xs text-gray-400 mt-0.5">Uses your camera</p>
              </button>
            )}
            {lookingUpBarcode && (
              <div className="py-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                Looking up product…
              </div>
            )}
            {barcodeError && !lookingUpBarcode && (
              <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center justify-between">
                <p className="text-red-500 text-sm">{barcodeError}</p>
                <button onClick={clearBarcode} className="text-gray-300 hover:text-gray-500 ml-3">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {barcodeResult && !lookingUpBarcode && (
              <div className="bg-white rounded-2xl p-3 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700 flex-1 mr-2">
                    🔍 {barcodeResult.description}
                  </p>
                  <button
                    onClick={clearBarcode}
                    disabled={savingBarcode}
                    className="text-gray-300 hover:text-gray-500 flex-shrink-0"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="text-left px-3 py-1.5 font-medium">Item</th>
                        <th className="text-right px-2 py-1.5 font-medium">kcal</th>
                        <th className="text-right px-2 py-1.5 font-medium text-blue-500">P</th>
                        <th className="text-right px-2 py-1.5 font-medium text-amber-500">C</th>
                        <th className="text-right px-2 py-1.5 font-medium text-orange-500">F</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {barcodeResult.items.map((item, i) => (
                        <tr key={i + item.name} className="text-gray-700">
                          <td className="px-3 py-1.5 capitalize">{item.name}</td>
                          <td className="text-right px-2 py-1.5">{item.calories}</td>
                          <td className="text-right px-2 py-1.5">{item.protein}g</td>
                          <td className="text-right px-2 py-1.5">{item.carbs}g</td>
                          <td className="text-right px-2 py-1.5">{item.fat}g</td>
                        </tr>
                      ))}
                      <tr className="bg-green-50 font-semibold text-green-800">
                        <td className="px-3 py-1.5">Total</td>
                        <td className="text-right px-2 py-1.5">{barcodeResult.total.calories}</td>
                        <td className="text-right px-2 py-1.5">{barcodeResult.total.protein}g</td>
                        <td className="text-right px-2 py-1.5">{barcodeResult.total.carbs}g</td>
                        <td className="text-right px-2 py-1.5">{barcodeResult.total.fat}g</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {saveBarcodeError && <p className="text-red-500 text-xs">{saveBarcodeError}</p>}
                <button
                  onClick={handleBarcodeSave}
                  disabled={savingBarcode}
                  className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-medium rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {savingBarcode ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                  ) : (
                    "Save Log →"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual tab */}
        {inputTab === "manual" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Food name (e.g. Greek yogurt, whole milk)"
              className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Calories (kcal)", value: manualCalories, set: setManualCalories },
                { label: "Protein (g)", value: manualProtein, set: setManualProtein },
                { label: "Carbs (g)", value: manualCarbs, set: setManualCarbs },
                { label: "Fat (g)", value: manualFat, set: setManualFat },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowManualAdvanced(!showManualAdvanced)}
              className="text-xs text-green-600 font-medium flex items-center gap-1"
            >
              {showManualAdvanced ? "▾" : "▸"} More nutrients
            </button>
            {showManualAdvanced && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Fiber (g)", value: manualFiber, set: setManualFiber },
                  { label: "Sugar (g)", value: manualSugar, set: setManualSugar },
                  { label: "Sodium (mg)", value: manualSodium, set: setManualSodium },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
            {manualError && <p className="text-red-500 text-xs">{manualError}</p>}
            <button
              onClick={handleManualSave}
              disabled={manualLoading || !manualName.trim()}
              className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-medium rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {manualLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              ) : manualSuccess ? "✓ Saved!" : "Save Log →"}
            </button>
          </div>
        )}

        {mealError && <p className="text-red-500 text-sm mt-2">{mealError}</p>}
        {mealSuccess && <p className="text-green-600 text-sm mt-2 font-medium">✓ Meal logged!</p>}
      </section>

      {/* My Logs Section */}
      <section className="flex-1 px-5 mt-4 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-green-900">My Logs</h2>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-500 px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Export CSV
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-5xl mb-3">🍽</div>
            <p className="text-gray-700 font-semibold">Nothing logged yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first meal above to start tracking</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm">
                {editingId === log.id ? (
                  <div className="space-y-2">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                      autoFocus
                    />
                    {editError && <p className="text-red-500 text-xs">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingId(null); setEditError(""); }}
                        className="flex-1 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEditSave(log.id)}
                        disabled={editLoading || !editText.trim()}
                        className="flex-1 py-1.5 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-60 flex items-center justify-center gap-1"
                      >
                        {editLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Saving…</> : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="font-semibold text-gray-800 text-sm leading-snug">{log.input_text}</div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-base font-bold text-green-700">{log.calories} kcal</span>
                          <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">{log.protein}g P</span>
                          <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md font-medium">{log.carbs}g C</span>
                          <span className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-md font-medium">{log.fat}g F</span>
                        </div>
                        {(log.fiber != null || log.sugar != null || log.sodium != null) && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {log.fiber != null && (
                              <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-medium">{log.fiber}g Fiber</span>
                            )}
                            {log.sugar != null && (
                              <span className="text-xs px-1.5 py-0.5 bg-pink-50 text-pink-600 rounded-md font-medium">{log.sugar}g Sugar</span>
                            )}
                            {log.sodium != null && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium">{log.sodium}mg Na</span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {deleteConfirmId !== log.id && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditingId(log.id); setEditText(log.input_text); setDeleteConfirmId(null); }}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(log.id)}
                            className="text-red-400 hover:text-red-600 text-xl transition-colors p-1"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    {deleteConfirmId === log.id && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm text-gray-500">Remove this entry?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              const res = await fetch(`${API_URL}/logs/${log.id}`, {
                                method: "DELETE",
                                headers: authHeaders(),
                              });
                              if (res.status === 401) { handleUnauthorized(); return; }
                              if (res.ok) { setDeleteConfirmId(null); loadLogs(); loadSummary(); }
                            }}
                            className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomNav />

      {/* Barcode scanner modal */}
      {barcodeScannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setBarcodeScannerOpen(false)}
        />
      )}
    </div>
  );
}
