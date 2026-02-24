"use client";

import { useState } from "react";
import { removeToken, getTimezone, safeSetItem } from "../../lib/auth";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
import HealthSurvey from "../components/HealthSurvey";
import WeightTracker from "../components/WeightTracker";
import GoalProgress from "../components/GoalProgress";
import { useProfile } from "../hooks/useProfile";
import { LogOut, BarChart3 } from "lucide-react";
import Link from "next/link";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function tzLabel(tz: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? "";
    return `${tz.replace(/_/g, " ").replace(/\//g, " / ")} (${offset})`;
  } catch {
    return tz;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const p = useProfile();
  const [timezone, setTimezoneState] = useState(getTimezone);

  const handleTimezoneChange = (tz: string) => {
    setTimezoneState(tz);
    safeSetItem("timezone", tz);
  };

  if (p.loading) return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
      <header className="px-5 py-3">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mt-2" />
      </header>
      <section className="px-5 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </section>
      <BottomNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
      <header className="px-5 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-green-900">Profile & Settings</h1>
          {p.profile?.is_premium && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Premium
            </span>
          )}
        </div>
        {p.profile && <p className="text-sm text-gray-500">{p.profile.email}</p>}
      </header>

      {p.surveyMode ? (
        <HealthSurvey
          surveyStep={p.surveyStep}
          setSurveyStep={p.setSurveyStep}
          sex={p.sex}
          setSex={p.setSex}
          age={p.age}
          setAge={p.setAge}
          heightFt={p.heightFt}
          setHeightFt={p.setHeightFt}
          heightIn={p.heightIn}
          setHeightIn={p.setHeightIn}
          heightUnit={p.heightUnit}
          setHeightUnit={p.setHeightUnit}
          heightCm={p.heightCm}
          setHeightCm={p.setHeightCm}
          surveyWeight={p.surveyWeight}
          setSurveyWeight={p.setSurveyWeight}
          weightUnit={p.weightUnit}
          toggleWeightUnit={p.toggleWeightUnit}
          activityLevel={p.activityLevel}
          setActivityLevel={p.setActivityLevel}
          goalType={p.goalType}
          setGoalType={p.setGoalType}
          calculating={p.calculating}
          calcError={p.calcError}
          onCalculateGoals={p.handleCalculateGoals}
        />
      ) : (
        <section className="px-5 mt-6">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-green-900">Health Profile</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : ""}{p.age ? ` \u00b7 ${p.age} yrs` : ""}{p.heightFt ? ` \u00b7 ${p.heightFt}'${p.heightIn || "0"}"` : ""}
                  {p.activityLevel ? ` \u00b7 ${p.activityLevel.replace("_", " ")}` : ""}
                </p>
              </div>
              <button
                onClick={() => { p.setSurveyMode(true); p.setSurveyStep(0); p.setCalculatedGoals(null); }}
                className="text-xs text-green-600 font-medium hover:text-green-800"
              >
                Edit
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Calories", value: p.calorieGoal ? `${p.calorieGoal} kcal` : "\u2014", color: "text-green-700" },
                { label: "Protein",  value: p.proteinGoal ? `${p.proteinGoal}g` : "\u2014",     color: "text-blue-600" },
                { label: "Carbs",    value: p.carbsGoal ? `${p.carbsGoal}g` : "\u2014",         color: "text-amber-600" },
                { label: "Fat",      value: p.fatGoal ? `${p.fatGoal}g` : "\u2014",             color: "text-orange-600" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">
              Goal: <span className="font-medium text-gray-600 capitalize">{p.goalType === "lose" ? "Lose weight" : p.goalType === "gain" ? "Build muscle" : "Maintain"}</span>
              {p.calculatedGoals ? ` \u00b7 BMR ${p.calculatedGoals.bmr} \u00b7 TDEE ${p.calculatedGoals.tdee} kcal` : ""}
            </p>
            {p.usedDefaultWeight && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Goals calculated using a default weight (154 lbs). Log your weight in the Weight section below for more accurate goals.
              </div>
            )}
          </div>
        </section>
      )}


      {p.todaySummary && (p.todaySummary.calorie_goal || p.todaySummary.protein_goal) && (
        <GoalProgress todaySummary={p.todaySummary} goalType={p.goalType} />
      )}

      <WeightTracker
        weightInput={p.weightInput}
        setWeightInput={p.setWeightInput}
        loggingWeight={p.loggingWeight}
        weightError={p.weightError}
        weightSuccess={p.weightSuccess}
        weightHistory={p.weightHistory}
        weightHistoryError={p.weightHistoryError}
        weightUnit={p.weightUnit}
        toggleWeightUnit={p.toggleWeightUnit}
        displayWeight={p.displayWeight}
        unitLabel={p.unitLabel}
        loading={p.loading}
        onLogWeight={p.handleLogWeight}
        goalWeight={p.goalWeight}
        setGoalWeight={p.setGoalWeight}
        savingGoalWeight={p.savingGoalWeight}
        goalWeightError={p.goalWeightError}
        goalWeightSuccess={p.goalWeightSuccess}
        onSaveGoalWeight={p.handleSaveGoalWeight}
        isPremium={!!p.profile?.is_premium}
        profileGoalWeight={p.profile?.goal_weight_lbs ?? null}
      />

      {/* Premium Analytics link */}
      <section className="px-5 mt-6">
        <Link
          href="/analytics"
          className="block bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-2xl p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-900">Premium Analytics</p>
              <p className="text-xs text-indigo-600">Trends, streaks, projections & more</p>
            </div>
          </div>
        </Link>
      </section>

      {/* Timezone Setting */}
      <section className="px-5 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-bold text-green-900 mb-3">Settings</h2>
          <div>
            <label htmlFor="timezone-select" className="text-sm text-gray-600 block mb-1">Timezone for meal logging</label>
            <select
              id="timezone-select"
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
            >
              {!COMMON_TIMEZONES.includes(timezone) && (
                <option value={timezone}>{tzLabel(timezone)}</option>
              )}
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tzLabel(tz)}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Used for meal times and daily log boundaries</p>
          </div>
        </div>
      </section>

      <section className="px-5 mt-6 pb-4">
        <button
          onClick={() => { removeToken(); router.push("/login"); }}
          className="w-full py-2 flex items-center justify-center gap-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </section>

      <section className="px-5 mt-3 pb-4">
        {!p.showDeleteConfirm ? (
          <button
            onClick={() => p.setShowDeleteConfirm(true)}
            className="w-full py-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            Delete account
          </button>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-sm text-gray-700 font-medium">Delete your account?</p>
            <p className="text-xs text-gray-500">
              This will permanently delete your account and all your data {"\u2014"} food logs, workouts, weight entries, and goals. This cannot be undone.
            </p>
            {p.deleteAccountError && (
              <p className="text-red-500 text-xs">{p.deleteAccountError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { p.setShowDeleteConfirm(false); p.setDeleteAccountError(""); }}
                disabled={p.deletingAccount}
                className="flex-1 py-2 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={p.handleDeleteAccount}
                disabled={p.deletingAccount}
                className="flex-1 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 font-medium"
              >
                {p.deletingAccount ? "Deleting\u2026" : "Yes, delete"}
              </button>
            </div>
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
}
