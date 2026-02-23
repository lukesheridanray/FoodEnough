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

      {/* Recommendations */}
      <section className="px-5 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-bold text-green-900 mb-3">Today's Recommendations</h2>
          <div className="space-y-2">
            {(() => {
              const tips: { icon: string; text: string; color: string }[] = [];
              const cal = todaySummary.calories_today;
              const calGoal = todaySummary.calorie_goal;
              const pro = todaySummary.protein_today;
              const proGoal = todaySummary.protein_goal;
              const carb = todaySummary.carbs_today;
              const carbGoal = todaySummary.carbs_goal;
              const fat = todaySummary.fat_today;
              const fatGoal = todaySummary.fat_goal;
              const calRem = calGoal ? calGoal - cal : null;

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

              if (goalType === "lose") {
                if (proGoal && pro >= proGoal * 0.8) {
                  tips.push({ icon: "\ud83c\udfc6", text: "High protein is helping preserve muscle while you cut \u2014 keep it up.", color: "text-green-600" });
                }
              }

              if (goalType === "gain") {
                if (carbGoal && carb < carbGoal * 0.5 && cal > 0) {
                  tips.push({ icon: "\ud83c\udf5a", text: "Carbs are low for a muscle-building day \u2014 fuel your training.", color: "text-amber-600" });
                }
              }

              if (tips.length === 0) {
                tips.push({ icon: "\u2728", text: "Everything on track \u2014 keep logging to stay consistent.", color: "text-green-600" });
              }

              return tips.slice(0, 3).map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl">
                  <span className="text-base flex-shrink-0">{tip.icon}</span>
                  <p className={`text-sm ${tip.color}`}>{tip.text}</p>
                </div>
              ));
            })()}
          </div>
        </div>
      </section>
    </>
  );
}
