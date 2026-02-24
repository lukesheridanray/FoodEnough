"use client";
import { useState } from "react";
import Link from "next/link";
import { LogOut, Camera, ScanBarcode, X, Loader2, MessageSquare, PenLine, Brain } from "lucide-react";
import BottomNav from "./components/BottomNav";
import BarcodeScanner from "./components/BarcodeScanner";
import SummaryCard from "./components/SummaryCard";
import TextInputTab from "./components/TextInputTab";
import PhotoInputTab from "./components/PhotoInputTab";
import ManualInputTab from "./components/ManualInputTab";
import LogList from "./components/LogList";
import ActivityInput from "./components/ActivityInput";
import BurnLogForm from "./components/BurnLogForm";
import BurnLogList from "./components/BurnLogList";
import { useFoodLogs, BarcodeResult } from "./hooks/useFoodLogs";
import { useHealthMetrics } from "./hooks/useHealthMetrics";
import { useBurnLogs } from "./hooks/useBurnLogs";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { getTzOffsetMinutes } from "../lib/auth";

export default function FoodEnoughApp() {
  const {
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
    exportError,
    loadLogs,
    loadSummary,
    loadFavorites,
    handleExport,
    handleEditSave,
    handleDelete,
    handleMoveMeal,
    handleQuickAdd,
    handleLogout,
    handleUnauthorized,
  } = useFoodLogs();

  const health = useHealthMetrics();
  const burn = useBurnLogs();

  const [inputTab, setInputTab] = useState<"text" | "photo" | "barcode" | "manual">("text");
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null);
  const [barcodeError, setBarcodeError] = useState("");
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [saveBarcodeError, setSaveBarcodeError] = useState("");
  const [barcodeSaveSuccess, setBarcodeSaveSuccess] = useState(false);
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false);

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
      const data = await res.json().catch(() => ({ status: 0 }));
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
      const sodium   = n["sodium_100g"] != null ? Math.round((n["sodium_100g"] as number) * 1000 * factor) : null;
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
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/logs/save-parsed?tz_offset_minutes=${tzOffset}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_text: barcodeResult.description,
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
      if (res.ok) {
        setBarcodeSaveSuccess(true);
        setTimeout(() => {
          setBarcodeSaveSuccess(false);
          clearBarcode();
        }, 1500);
        loadLogs();
        loadSummary();
        loadFavorites();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveBarcodeError(err.detail || "Failed to save. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setSaveBarcodeError("Network error. Is the backend running?");
    } finally {
      setSavingBarcode(false);
    }
  };

  const onLogged = () => {
    loadLogs();
    loadSummary();
    loadFavorites();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex flex-col">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3">
        <span className="text-green-800 font-medium text-lg">{"\ud83c\udf3f"} FoodEnough</span>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} title="Log out" className="p-2">
            <LogOut className="w-5 h-5 text-green-700" />
          </button>
        </div>
      </header>

      <SummaryCard summary={summary} summaryLoading={summaryLoading} todayExpenditure={health.todayMetric?.total_expenditure} />

      {/* Today's Recommendations */}
      {summary && (summary.calorie_goal || summary.protein_goal) && (() => {
        const goalType = summary.goal_type ?? "maintain";
        const effectiveCalGoal = (summary.ani_active && summary.ani_calorie_goal)
          ? summary.ani_calorie_goal : summary.calorie_goal;
        const effectiveProGoal = (summary.ani_active && summary.ani_protein_goal)
          ? summary.ani_protein_goal : summary.protein_goal;
        const cal = summary.calories_today;
        const pro = summary.protein_today;
        const carb = summary.carbs_today;
        const calGoal = effectiveCalGoal;
        const proGoal = effectiveProGoal;
        const carbGoal = (summary.ani_active && summary.ani_carbs_goal)
          ? summary.ani_carbs_goal : summary.carbs_goal;
        const calRem = calGoal ? calGoal - cal : null;

        const tips: { icon: string; text: string; color: string }[] = [];

        if (cal === 0) {
          tips.push({ icon: "\ud83c\udf7d", text: "Log your first meal to start tracking today's progress.", color: "text-gray-600" });
        }

        if (calGoal && calRem !== null) {
          if (calRem < -200) {
            tips.push({ icon: "\u26a0\ufe0f", text: `You're ${Math.abs(calRem)} kcal over your goal \u2014 consider a lighter dinner.`, color: "text-red-600" });
          } else if (calRem < 100) {
            tips.push({ icon: "\u2705", text: "Calorie goal hit for today \u2014 great work.", color: "text-green-600" });
          } else if (goalType === "gain" && calRem > 300) {
            tips.push({ icon: "\ud83d\udcc8", text: `You still need ${calRem} kcal to hit your surplus \u2014 don't skip a meal.`, color: "text-orange-600" });
          } else if (goalType === "lose" && calRem > 0) {
            tips.push({ icon: "\ud83c\udfaf", text: `${calRem} kcal remaining \u2014 you're on track for your deficit.`, color: "text-blue-600" });
          } else if (goalType === "maintain" && calRem > 0) {
            tips.push({ icon: "\u2696\ufe0f", text: `${calRem} kcal remaining to hit your maintenance target.`, color: "text-green-700" });
          }
        }

        if (proGoal && pro > 0) {
          const proteinPct = Math.round((pro / proGoal) * 100);
          if (proteinPct >= 100) {
            tips.push({ icon: "\ud83d\udcaa", text: "Protein goal hit \u2014 your muscles are taken care of.", color: "text-blue-600" });
          } else if (proteinPct < 50 && cal > (calGoal ?? 0) * 0.5) {
            tips.push({ icon: "\ud83e\udd69", text: `Protein is at ${proteinPct}% \u2014 add a lean protein source to your next meal.`, color: "text-blue-600" });
          }
        } else if (proGoal && pro === 0 && cal > 0) {
          tips.push({ icon: "\ud83e\udd69", text: "No protein tracked yet \u2014 prioritise a protein source at your next meal.", color: "text-blue-600" });
        }

        if (goalType === "lose" && proGoal && pro >= proGoal * 0.8) {
          tips.push({ icon: "\ud83c\udfc6", text: "High protein is helping preserve muscle while you cut \u2014 keep it up.", color: "text-green-600" });
        }

        if (goalType === "gain" && carbGoal && carb < carbGoal * 0.5 && cal > 0) {
          tips.push({ icon: "\ud83c\udf5a", text: "Carbs are low for a muscle-building day \u2014 fuel your training.", color: "text-amber-600" });
        }

        if (tips.length === 0) {
          tips.push({ icon: "\u2728", text: "Everything on track \u2014 keep logging to stay consistent.", color: "text-green-600" });
        }

        return (
          <section className="px-5 mt-3">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h2 className="text-sm font-bold text-green-900 mb-2">Today's Recommendations</h2>
              <div className="space-y-1.5">
                {tips.slice(0, 3).map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-sm flex-shrink-0">{tip.icon}</span>
                    <p className={`text-xs ${tip.color}`}>{tip.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      <ActivityInput
        todayMetric={health.todayMetric}
        loading={health.loading}
        saving={health.saving}
        saveError={health.saveError}
        saveSuccess={health.saveSuccess}
        onSave={health.saveDaily}
      />

      <BurnLogForm
        onSubmit={async (input) => {
          const ok = await burn.createBurnLog(input);
          if (ok) loadSummary();
          return ok;
        }}
        error={burn.createError}
        onErrorClear={() => burn.setCreateError("")}
      />

      <BurnLogList
        burnLogs={burn.burnLogs}
        loading={burn.loading}
        deleteError={burn.deleteError}
        onDelete={async (id) => {
          const ok = await burn.deleteBurnLog(id);
          if (ok) loadSummary();
          return ok;
        }}
      />

      {/* ANI progress nudge */}
      {summary && summary.calorie_goal && !summary.ani_active && summary.ani_days_logged_7d != null && summary.ani_days_logged_7d > 0 && (
        <section className="px-5 mt-3">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                {summary.ani_eligible ? (
                  <p className="text-sm font-semibold text-amber-800">
                    Your first recalibration is ready!
                  </p>
                ) : (
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">{summary.ani_days_logged_7d} of 7 days</span> logged — {7 - summary.ani_days_logged_7d} more until your goals adapt
                  </p>
                )}
              </div>
            </div>
            {/* Progress bar: 7 segments */}
            <div className="flex gap-1 mb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < summary.ani_days_logged_7d! ? "bg-amber-400" : "bg-amber-200"
                  }`}
                />
              ))}
            </div>
            {summary.ani_eligible && (
              <Link
                href="/ani"
                className="block text-center text-sm font-medium text-amber-700 hover:text-amber-800 mt-1"
              >
                Go to Adapt &rarr;
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Quick-add favorites */}
      {favorites.length > 0 && (
        <section className="px-5 mt-3">
          <p className="text-xs font-medium text-gray-400 mb-1.5">Quick add</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {favorites.map((fav) => (
              <button
                key={fav.input_text}
                onClick={() => handleQuickAdd(fav)}
                className="flex-shrink-0 bg-white border border-green-200 rounded-full px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors shadow-sm"
              >
                {fav.input_text} <span className="text-gray-400 ml-1">{Math.round(fav.avg_calories)} kcal</span>
              </button>
            ))}
          </div>
        </section>
      )}

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

        {inputTab === "text" && (
          <TextInputTab
            onLogged={onLogged}
            onUnauthorized={handleUnauthorized}
            onSwitchToBarcode={() => setInputTab("barcode")}
          />
        )}

        {inputTab === "photo" && (
          <PhotoInputTab
            onLogged={onLogged}
            onUnauthorized={handleUnauthorized}
          />
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
                Looking up product{"\u2026"}
              </div>
            )}
            {barcodeError && !lookingUpBarcode && (
              <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center justify-between">
                <p className="text-red-500 text-sm">{barcodeError}</p>
                <button onClick={clearBarcode} className="text-gray-300 hover:text-gray-500 ml-3 p-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {barcodeResult && !lookingUpBarcode && (
              <div className="bg-white rounded-2xl p-3 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700 flex-1 mr-2">
                    {barcodeResult.description}
                  </p>
                  <button
                    onClick={clearBarcode}
                    disabled={savingBarcode}
                    className="text-gray-300 hover:text-gray-500 flex-shrink-0 p-2"
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
                  disabled={savingBarcode || barcodeSaveSuccess}
                  className={`w-full py-2 text-sm font-medium rounded-xl shadow-sm flex items-center justify-center gap-1.5 ${
                    barcodeSaveSuccess
                      ? "bg-green-100 text-green-700"
                      : "bg-gradient-to-r from-green-600 to-green-500 text-white disabled:opacity-60"
                  }`}
                >
                  {barcodeSaveSuccess ? (
                    "\u2713 Logged!"
                  ) : savingBarcode ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Saving{"\u2026"}</>
                  ) : (
                    "Save Log \u2192"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {inputTab === "manual" && (
          <ManualInputTab
            onLogged={onLogged}
            onUnauthorized={handleUnauthorized}
          />
        )}
      </section>

      <LogList
        logs={logs}
        deleteConfirmId={deleteConfirmId}
        setDeleteConfirmId={setDeleteConfirmId}
        editingId={editingId}
        setEditingId={setEditingId}
        editText={editText}
        setEditText={setEditText}
        editLoading={editLoading}
        editError={editError}
        setEditError={setEditError}
        deleteError={deleteError}
        exportError={exportError}
        onEditSave={handleEditSave}
        onDelete={handleDelete}
        onExport={handleExport}
        onMoveMeal={handleMoveMeal}
      />

      <BottomNav />

      {barcodeScannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setBarcodeScannerOpen(false)}
        />
      )}
    </div>
  );
}
