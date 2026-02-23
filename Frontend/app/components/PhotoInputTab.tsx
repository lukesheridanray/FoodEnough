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

export default function PhotoInputTab({ onLogged, onUnauthorized }: PhotoInputTabProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [saveImageError, setSaveImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const res = await apiFetch("/parse_log/image", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setImageAnalysis(await res.json());
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

  const handleImageSave = async () => {
    if (!imageAnalysis) return;
    setSaveImageError("");
    setSavingImage(true);
    try {
      const tzOffset = getTzOffsetMinutes();
      const res = await apiFetch(`/logs/save-parsed?tz_offset_minutes=${tzOffset}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_text: imageAnalysis.description,
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
      if (res.ok) {
        clearImage();
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
