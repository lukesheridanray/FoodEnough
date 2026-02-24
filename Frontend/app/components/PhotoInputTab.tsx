"use client";
import { useState, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { apiFetch, UnauthorizedError } from "../../lib/api";
import { getTzOffsetMinutes } from "../../lib/auth";
import { ImageAnalysis } from "../hooks/useFoodLogs";

interface PhotoInputTabProps {
  onLogged: () => void;
  onUnauthorized: () => void;
}

interface EditableTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function PhotoInputTab({ onLogged, onUnauthorized }: PhotoInputTabProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [saveImageError, setSaveImageError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editTotals, setEditTotals] = useState<EditableTotals | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setAnalysisError("");
    setImageAnalysis(null);
    setSaveImageError("");
    setEditTotals(null);
  };

  const analyzeImage = async (file: File) => {
    setAnalyzingImage(true);
    setAnalysisError("");
    setImageAnalysis(null);
    setSaveImageError("");
    setEditTotals(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await apiFetch("/parse_log/image", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const analysis: ImageAnalysis = await res.json();
        setImageAnalysis(analysis);
        setEditTotals({
          calories: analysis.total.calories,
          protein: analysis.total.protein,
          carbs: analysis.total.carbs,
          fat: analysis.total.fat,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setAnalysisError(err.detail || "Failed to analyze photo. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { onUnauthorized(); return; }
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

  const handleFieldChange = (field: keyof EditableTotals, value: string) => {
    if (!editTotals) return;
    const num = value === "" ? 0 : Math.max(0, Math.round(Number(value)));
    if (isNaN(num)) return;
    setEditTotals({ ...editTotals, [field]: num });
  };

  const handleImageSave = async () => {
    if (!imageAnalysis || !editTotals) return;
    setSaveImageError("");
    setSavingImage(true);
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/logs/save-parsed?tz_offset_minutes=${tzOffset}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_text: imageAnalysis.description,
          calories: editTotals.calories,
          protein: editTotals.protein,
          carbs: editTotals.carbs,
          fat: editTotals.fat,
          fiber: null,
          sugar: null,
          sodium: null,
          parsed_json: JSON.stringify({
            description: imageAnalysis.description,
            items: imageAnalysis.items,
            total: editTotals,
          }),
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          clearImage();
        }, 1500);
        onLogged();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveImageError(err.detail || "Failed to save. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { onUnauthorized(); return; }
      setSaveImageError("Network error. Is the backend running?");
    } finally {
      setSavingImage(false);
    }
  };

  return (
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
                  <Loader2 className="w-3 h-3 animate-spin" /> Analyzing photo{"\u2026"}
                </p>
              )}
              {!analyzingImage && imageAnalysis && (
                <p className="text-xs text-green-600 mt-0.5">{imageAnalysis.description}</p>
              )}
            </div>
            <button
              onClick={clearImage}
              disabled={savingImage}
              className="text-gray-300 hover:text-gray-500 flex-shrink-0 p-2"
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
                </tbody>
              </table>
            </div>
          )}

          {/* Editable totals form */}
          {editTotals && (
            <div className="border border-green-200 rounded-xl p-3 bg-green-50/50">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Adjust before logging</p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5 font-medium">kcal</label>
                  <input
                    type="number"
                    min="0"
                    value={editTotals.calories || ""}
                    onChange={(e) => handleFieldChange("calories", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-blue-500 mb-0.5 font-medium">Protein</label>
                  <input
                    type="number"
                    min="0"
                    value={editTotals.protein || ""}
                    onChange={(e) => handleFieldChange("protein", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-amber-500 mb-0.5 font-medium">Carbs</label>
                  <input
                    type="number"
                    min="0"
                    value={editTotals.carbs || ""}
                    onChange={(e) => handleFieldChange("carbs", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-orange-500 mb-0.5 font-medium">Fat</label>
                  <input
                    type="number"
                    min="0"
                    value={editTotals.fat || ""}
                    onChange={(e) => handleFieldChange("fat", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {imageAnalysis && imageAnalysis.items.length > 0 && (
            <p className="text-xs text-gray-400 italic flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              Nutrition estimated by AI — edit values above if needed
            </p>
          )}
          {saveImageError && <p className="text-red-500 text-xs">{saveImageError}</p>}
          {imageAnalysis && (
            <button
              onClick={handleImageSave}
              disabled={savingImage || saveSuccess}
              className={`w-full py-2 text-sm font-medium rounded-xl shadow-sm flex items-center justify-center gap-1.5 ${
                saveSuccess
                  ? "bg-green-100 text-green-700"
                  : "bg-gradient-to-r from-green-600 to-green-500 text-white disabled:opacity-60"
              }`}
            >
              {saveSuccess ? (
                "\u2713 Logged!"
              ) : savingImage ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving{"\u2026"}</>
              ) : (
                "Save Log \u2192"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
