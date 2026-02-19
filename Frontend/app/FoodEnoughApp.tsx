"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, Plus, LogOut, X, Camera, Loader2, ScanBarcode } from "lucide-react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, authHeaders } from "../lib/auth";
import BottomNav from "./components/BottomNav";
import BarcodeScanner from "./components/BarcodeScanner";

interface Summary {
  calories_today: number;
  calorie_goal: number | null;
  calories_remaining: number | null;
  latest_weight_lbs: number | null;
  latest_workout_name: string | null;
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
  total: { calories: number; protein: number; carbs: number; fat: number };
}

export default function FoodEnoughApp() {
  const [logs, setLogs] = useState<any[]>([]);
  const [mealError, setMealError] = useState("");
  const [logging, setLogging] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
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
  const mealInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const router = useRouter();

  const handleUnauthorized = () => {
    removeToken();
    router.push("/login");
  };

  const loadLogs = async () => {
    try {
      const res = await fetch(`${apiUrl}/logs/today`, { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await fetch(`${apiUrl}/summary/today`, { headers: authHeaders() });
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
      const res = await fetch(`${apiUrl}/logs/export`, { headers: authHeaders() });
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

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  const formatCaloriesRemaining = () => {
    if (!summary) return "—";
    if (summary.calories_remaining === null) return `${summary.calories_today} kcal eaten`;
    return `${summary.calories_remaining} kcal left`;
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
      const name     = p.product_name || p.product_name_en || "Unknown product";

      setBarcodeResult({
        description: name,
        items: [{ name: label, calories, protein, carbs, fat }],
        total: { calories, protein, carbs, fat },
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
      const res = await fetch(`${apiUrl}/logs/save-parsed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          input_text: `🔍 ${barcodeResult.description}`,
          calories: barcodeResult.total.calories,
          protein: barcodeResult.total.protein,
          carbs: barcodeResult.total.carbs,
          fat: barcodeResult.total.fat,
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
      const res = await fetch(`${apiUrl}/parse_log/image`, {
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
      const res = await fetch(`${apiUrl}/logs/save-parsed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          input_text: `📷 ${imageAnalysis.description}`,
          calories: imageAnalysis.total.calories,
          protein: imageAnalysis.total.protein,
          carbs: imageAnalysis.total.carbs,
          fat: imageAnalysis.total.fat,
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

  const summaryCards = [
    {
      label: summary?.calorie_goal ? "Calories Remaining" : "Calories Today",
      value: formatCaloriesRemaining(),
      icon: "🍽",
    },
    {
      label: "Last Workout",
      value: summary?.latest_workout_name ?? "None yet",
      icon: "💪",
    },
    {
      label: "Current Weight",
      value: summary?.latest_weight_lbs ? `${summary.latest_weight_lbs} lb` : "Not logged",
      icon: "⚖️",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex flex-col">
      <div className="h-6" />

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3">
        <span className="text-green-800 font-medium text-lg">🌿 FoodEnough</span>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} title="Log out">
            <LogOut className="w-5 h-5 text-green-700" />
          </button>
          <Bell className="w-7 h-7 text-green-800" />
        </div>
      </header>

      {/* Today's Summary */}
      <section className="px-5 mt-2">
        <h2 className="text-lg font-bold text-green-900 mb-2">Today's Summary</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {summaryLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="flex-shrink-0 bg-white rounded-2xl shadow-sm p-4 w-48 animate-pulse">
                <div className="h-8 w-8 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-5 w-20 bg-gray-200 rounded" />
              </div>
            ))
          ) : (
            summaryCards.map((card, i) => (
              <div key={i} className="flex-shrink-0 bg-white rounded-2xl shadow-sm p-4 w-48">
                <div className="text-3xl mb-1">{card.icon}</div>
                <div className="text-sm text-gray-600">{card.label}</div>
                <div className="text-green-700 font-semibold text-lg">{card.value}</div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Add Food Form */}
      <section className="px-5 mt-4">
        <h2 className="text-lg font-bold text-green-900 mb-2">Add Meal</h2>

        {/* Text input row */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const input = (e.target as any).meal.value;
            if (!input.trim()) return;
            setMealError("");
            setLogging(true);
            try {
              const res = await fetch(`${apiUrl}/save_log`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ input_text: input }),
              });
              if (res.status === 401) { handleUnauthorized(); return; }
              if (res.ok) {
                (e.target as any).reset();
                loadLogs();
                loadSummary();
              } else {
                setMealError("Failed to log meal. Please try again.");
              }
            } catch (err) {
              console.error("Error saving meal:", err);
              setMealError("Network error. Is the backend running?");
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
          {/* Camera button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-white border border-green-300 rounded-xl shadow-sm hover:bg-green-50 transition-colors flex-shrink-0"
            title="Log with photo"
          >
            <Camera className="w-5 h-5 text-green-600" />
          </button>
          {/* Barcode scan button */}
          <button
            type="button"
            onClick={() => { clearBarcode(); setBarcodeScannerOpen(true); }}
            disabled={lookingUpBarcode}
            className="p-2 bg-white border border-green-300 rounded-xl shadow-sm hover:bg-green-50 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Scan barcode"
          >
            <ScanBarcode className="w-5 h-5 text-green-600" />
          </button>
        </form>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageSelect}
        />

        {mealError && <p className="text-red-500 text-sm mt-2">{mealError}</p>}

        {/* Barcode lookup spinner */}
        {lookingUpBarcode && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-green-600" />
            Looking up product…
          </div>
        )}

        {/* Barcode lookup error */}
        {barcodeError && !lookingUpBarcode && (
          <div className="mt-3 bg-white rounded-2xl p-3 shadow-sm flex items-center justify-between">
            <p className="text-red-500 text-sm">{barcodeError}</p>
            <button onClick={clearBarcode} className="text-gray-300 hover:text-gray-500 ml-3">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Barcode result card */}
        {barcodeResult && !lookingUpBarcode && (
          <div className="mt-3 bg-white rounded-2xl p-3 shadow-sm space-y-3">
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
                    <th className="text-right px-2 py-1.5 font-medium">P</th>
                    <th className="text-right px-2 py-1.5 font-medium">C</th>
                    <th className="text-right px-2 py-1.5 font-medium">F</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {barcodeResult.items.map((item, i) => (
                    <tr key={i} className="text-gray-700">
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

        {/* Photo preview card */}
        {imagePreview && (
          <div className="mt-3 bg-white rounded-2xl p-3 shadow-sm space-y-3">
            {/* Image + filename row */}
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

            {/* Analysis error */}
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

            {/* Per-item breakdown */}
            {imageAnalysis && imageAnalysis.items.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium">Item</th>
                      <th className="text-right px-2 py-1.5 font-medium">kcal</th>
                      <th className="text-right px-2 py-1.5 font-medium">P</th>
                      <th className="text-right px-2 py-1.5 font-medium">C</th>
                      <th className="text-right px-2 py-1.5 font-medium">F</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {imageAnalysis.items.map((item, i) => (
                      <tr key={i} className="text-gray-700">
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

            {/* Save error */}
            {saveImageError && <p className="text-red-500 text-xs">{saveImageError}</p>}

            {/* Confirm save button */}
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
          <p className="text-gray-500 text-sm">No meals logged today.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-800">{log.input_text}</div>
                    <div className="text-sm text-gray-500">
                      {log.calories} kcal • {log.protein}P • {log.carbs}C • {log.fat}F
                    </div>
                  </div>
                  {deleteConfirmId !== log.id && (
                    <button
                      onClick={() => setDeleteConfirmId(log.id)}
                      className="text-red-400 hover:text-red-600 text-xl ml-3 transition-colors flex-shrink-0"
                      title="Delete"
                    >
                      ×
                    </button>
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
                          const res = await fetch(`${apiUrl}/logs/${log.id}`, {
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
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FAB overlay menu */}
      {fabOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setFabOpen(false)}>
          <div
            className="absolute bottom-24 right-6 flex flex-col gap-2 items-end"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setFabOpen(false); router.push("/workouts"); }}
              className="flex items-center gap-2 bg-white text-green-800 font-medium text-sm px-4 py-2 rounded-full shadow-lg border border-green-100"
            >
              💪 Generate Workout
            </button>
            <button
              onClick={() => {
                setFabOpen(false);
                mealInputRef.current?.focus();
                mealInputRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-2 bg-white text-green-800 font-medium text-sm px-4 py-2 rounded-full shadow-lg border border-green-100"
            >
              🍽 Log a Meal
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setFabOpen((o) => !o)}
        className="fixed bottom-20 right-6 z-50 w-16 h-16 bg-gradient-to-br from-green-500 to-green-400 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        {fabOpen ? <X className="w-6 h-6" /> : <Plus className="w-8 h-8" />}
      </button>

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
