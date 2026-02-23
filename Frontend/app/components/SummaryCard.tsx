"use client";
import Link from "next/link";
import { Summary } from "../hooks/useFoodLogs";

interface SummaryCardProps {
  summary: Summary | null;
  summaryLoading: boolean;
}

export default function SummaryCard({ summary, summaryLoading }: SummaryCardProps) {
  return (
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
                  {summary.latest_weight_lbs ? `${summary.latest_weight_lbs} lb` : "\u2014"}
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

          {/* Goal nudge */}
          {!summary.calorie_goal && summary.calories_today === 0 && (
            <Link
              href="/profile"
              className="block mt-3 text-xs text-center text-green-600 bg-green-50 rounded-xl px-3 py-2 hover:bg-green-100 transition-colors"
            >
              Set up your calorie and macro goals in Profile for personalized tracking
            </Link>
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
  );
}
