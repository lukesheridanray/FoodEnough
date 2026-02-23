"use client";
import { useState } from "react";
import { LogOut, Camera, ScanBarcode, X, Loader2, MessageSquare, PenLine } from "lucide-react";
import BottomNav from "./components/BottomNav";
import BarcodeScanner from "./components/BarcodeScanner";
import SummaryCard from "./components/SummaryCard";
import TextInputTab from "./components/TextInputTab";
import PhotoInputTab from "./components/PhotoInputTab";
import ManualInputTab from "./components/ManualInputTab";
import LogList from "./components/LogList";
import { useFoodLogs, BarcodeResult } from "./hooks/useFoodLogs";
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
    handleQuickAdd,
    handleLogout,
    handleUnauthorized,
  } = useFoodLogs();

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

      <SummaryCard summary={summary} summaryLoading={summaryLoading} />

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
