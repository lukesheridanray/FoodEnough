"use client";
import { TodaySummary } from "../hooks/useProfile";

interface GoalProgressProps {
  todaySummary: TodaySummary;
  goalType: "lose" | "maintain" | "gain";
}

export default function GoalProgress({ todaySummary, goalType }: GoalProgressProps) {
  // Resolve effective goals: prefer ANI targets when active
  const effectiveCalGoal = (todaySummary.ani_active && todaySummary.ani_calorie_goal)
    ? todaySummary.ani_calorie_goal : todaySummary.calorie_goal;
  const effectiveProGoal = (todaySummary.ani_active && todaySummary.ani_protein_goal)
    ? todaySummary.ani_protein_goal : todaySummary.protein_goal;
  const effectiveCarbsGoal = (todaySummary.ani_active && todaySummary.ani_carbs_goal)
    ? todaySummary.ani_carbs_goal : todaySummary.carbs_goal;
  const effectiveFatGoal = (todaySummary.ani_active && todaySummary.ani_fat_goal)
    ? todaySummary.ani_fat_goal : todaySummary.fat_goal;

  return (
    <>
      {/* Today's Progress */}
      <section className="px-5 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-bold text-green-900 mb-4">Today's Progress</h2>
          <div className="space-y-4">
            {[
              {
                label: "Calories",
                value: todaySummary.calories_today,
                goal: effectiveCalGoal,
                bar: "bg-green-500",
                text: "text-green-700",
                unit: "kcal",
              },
              {
                label: "Protein",
                value: todaySummary.protein_today,
                goal: effectiveProGoal,
                bar: "bg-blue-500",
                text: "text-blue-600",
                unit: "g",
              },
              {
                label: "Carbs",
                value: todaySummary.carbs_today,
                goal: effectiveCarbsGoal,
                bar: "bg-amber-500",
                text: "text-amber-600",
                unit: "g",
              },
              {
                label: "Fat",
                value: todaySummary.fat_today,
                goal: effectiveFatGoal,
                bar: "bg-orange-500",
                text: "text-orange-600",
                unit: "g",
              },
            ].map((item) => {
              const pct = item.goal ? Math.min(100, Math.round((item.value / item.goal) * 100)) : null;
              return (
                <div key={item.label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm">
                      <span className={`font-bold ${item.text}`}>{item.value}{item.unit}</span>
                      {item.goal && (
                        <span className="text-gray-400 text-xs"> / {item.goal}{item.unit}</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.bar} rounded-full transition-all`}
                      style={{ width: pct !== null ? `${pct}%` : item.value > 0 ? "100%" : "0%" }}
                    />
                  </div>
                  {pct !== null && (
                    <p className="text-xs text-gray-400 mt-0.5 text-right">{pct}%</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </>
  );
}
