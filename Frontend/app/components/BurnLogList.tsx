"use client";
import { useState } from "react";
import { Trash2, Heart } from "lucide-react";
import { BurnLog } from "../hooks/useBurnLogs";

const WORKOUT_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  running: { label: "Running", emoji: "\ud83c\udfc3" },
  weight_training: { label: "Weights", emoji: "\ud83c\udfcb\ufe0f" },
  cycling: { label: "Cycling", emoji: "\ud83d\udeb4" },
  swimming: { label: "Swimming", emoji: "\ud83c\udfca" },
  walking: { label: "Walking", emoji: "\ud83d\udeb6" },
  hiit: { label: "HIIT", emoji: "\u26a1" },
  yoga: { label: "Yoga", emoji: "\ud83e\uddd8" },
  other: { label: "Other", emoji: "\ud83d\udcaa" },
};

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  manual: { label: "Manual", color: "bg-gray-100 text-gray-600" },
  plan_session: { label: "Workout Plan", color: "bg-blue-50 text-blue-600" },
  healthkit: { label: "Apple Health", color: "bg-red-50 text-red-600" },
  health_connect: { label: "Health Connect", color: "bg-green-50 text-green-600" },
};

interface BurnLogListProps {
  burnLogs: BurnLog[];
  loading: boolean;
  deleteError: string;
  onDelete: (id: number) => Promise<boolean>;
}

export default function BurnLogList({ burnLogs, loading, deleteError, onDelete }: BurnLogListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  if (loading || burnLogs.length === 0) return null;

  return (
    <section className="px-5 mt-3">
      <p className="text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Today's Workouts</p>
      <div className="space-y-2">
        {burnLogs.map((bl) => {
          const typeInfo = WORKOUT_TYPE_LABELS[bl.workout_type] || WORKOUT_TYPE_LABELS.other;
          const sourceInfo = SOURCE_BADGES[bl.source] || SOURCE_BADGES.manual;
          const canDelete = bl.source === "manual" || bl.source === "plan_session";

          return (
            <div key={bl.id} className="bg-white rounded-2xl shadow-sm p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{typeInfo.emoji}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{typeInfo.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${sourceInfo.color}`}>
                        {sourceInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span className="font-semibold text-orange-600">{Math.round(bl.calories_burned)} kcal</span>
                      {bl.duration_minutes != null && (
                        <span>{bl.duration_minutes} min</span>
                      )}
                      {bl.avg_heart_rate != null && (
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-3 h-3 text-red-400" />
                          {bl.avg_heart_rate} bpm
                        </span>
                      )}
                    </div>
                    {bl.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{bl.notes}</p>
                    )}
                  </div>
                </div>
                {canDelete && (
                  <div className="flex-shrink-0">
                    {deleteConfirmId === bl.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => {
                            await onDelete(bl.id);
                            setDeleteConfirmId(null);
                          }}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(bl.id)}
                        className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {deleteError && <p className="text-red-500 text-xs mt-1">{deleteError}</p>}
    </section>
  );
}
