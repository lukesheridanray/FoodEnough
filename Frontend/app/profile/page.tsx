"use client";

import { useState } from "react";
import { removeToken, getTimezone, safeSetItem } from "../../lib/auth";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
import HealthSurvey from "../components/HealthSurvey";
import WeightTracker from "../components/WeightTracker";
import { useProfile } from "../hooks/useProfile";
import { LogOut, BarChart3, User, ChevronRight, Clock, Trash2 } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-24">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
      <header className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
          <div>
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mt-1.5" />
          </div>
        </div>
      </header>
      <section className="px-5 mt-5">
        <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
          <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </section>
      <BottomNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-24">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />

      {/* Profile Header */}
      <header className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {p.profile?.email?.split("@")[0] || "Profile"}
              </h1>
              {p.profile?.is_premium && (
                <span className="text-[10px] font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm flex-shrink-0">
                  Pro
                </span>
              )}
            </div>
            {p.profile && <p className="text-xs text-gray-400 truncate">{p.profile.email}</p>}
          </div>
        </div>
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
        <section className="px-5 mt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Daily Targets</h2>
              <button
                onClick={() => { p.setSurveyMode(true); p.setSurveyStep(0); p.setCalculatedGoals(null); }}
                className="text-xs text-green-600 font-semibold hover:text-green-800 transition-colors"
              >
                Edit
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Cal", value: p.calorieGoal || "\u2014", unit: "", color: "text-green-700", bg: "bg-green-50" },
                { label: "Protein", value: p.proteinGoal || "\u2014", unit: "g", color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Carbs", value: p.carbsGoal || "\u2014", unit: "g", color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Fat", value: p.fatGoal || "\u2014", unit: "g", color: "text-orange-600", bg: "bg-orange-50" },
              ].map((item) => (
                <div key={item.label} className={`${item.bg} rounded-xl p-2.5 text-center`}>
                  <p className={`text-base font-bold ${item.color}`}>{item.value}{item.unit && typeof item.value === 'string' && item.value !== "\u2014" ? "" : ""}{typeof item.value !== 'string' ? item.unit : ""}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-xs text-gray-400">
                {p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : ""}{p.age ? ` \u00b7 ${p.age}y` : ""}{p.heightFt ? ` \u00b7 ${p.heightFt}'${p.heightIn || "0"}"` : ""}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium capitalize">
                {p.goalType === "lose" ? "Lose" : p.goalType === "gain" ? "Gain" : "Maintain"}
              </span>
            </div>
            {p.usedDefaultWeight && (
              <div className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center">
                Using default weight (154 lbs). Log your weight below for more accurate goals.
              </div>
            )}
          </div>
        </section>
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
      <section className="px-5 mt-5">
        <Link
          href="/analytics"
          className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Premium Analytics</p>
            <p className="text-xs text-gray-400">Trends, streaks & projections</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
      </section>

      {/* Settings */}
      <section className="px-5 mt-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Settings</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Timezone */}
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <label htmlFor="timezone-select" className="text-sm font-medium text-gray-700 block">Timezone</label>
                <select
                  id="timezone-select"
                  value={timezone}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                  className="w-full text-xs text-gray-500 mt-0.5 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  {!COMMON_TIMEZONES.includes(timezone) && (
                    <option value={timezone}>{tzLabel(timezone)}</option>
                  )}
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tzLabel(tz)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 mx-4" />

          {/* Log Out */}
          <button
            onClick={() => { removeToken(); router.push("/login"); }}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500">Log Out</span>
          </button>

          <div className="h-px bg-gray-100 mx-4" />

          {/* Delete Account */}
          {!p.showDeleteConfirm ? (
            <button
              onClick={() => p.setShowDeleteConfirm(true)}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-gray-400" />
              </div>
              <span className="text-sm text-gray-400">Delete Account</span>
            </button>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700 font-medium">Delete your account?</p>
              <p className="text-xs text-gray-500">
                This will permanently delete all your data {"\u2014"} food logs, workouts, weight entries, and goals. This cannot be undone.
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
        </div>
      </section>

      <div className="h-6" />
      <BottomNav />
    </div>
  );
}
