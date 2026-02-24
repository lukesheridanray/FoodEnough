"use client";

import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import BottomNav from "../components/BottomNav";
import FitnessQuiz from "../components/FitnessQuiz";
import WorkoutPlanView from "../components/WorkoutPlanView";
import { useWorkouts } from "../hooks/useWorkouts";

export default function WorkoutsPage() {
  const w = useWorkouts();

  if (w.loading) return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
      <header className="px-5 py-3">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
      </header>
      <section className="px-5 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
          <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
          <div className="h-12 w-full bg-gray-100 rounded-xl mb-3" />
          <div className="h-12 w-full bg-gray-100 rounded-xl" />
        </div>
      </section>
      <BottomNav />
    </div>
  );

  // -- QUIZ --
  if (w.quizMode) {
    return (
      <FitnessQuiz
        quizStep={w.quizStep}
        setQuizStep={w.setQuizStep}
        quizAnswers={w.quizAnswers}
        limitations={w.limitations}
        setLimitations={w.setLimitations}
        savingProfile={w.savingProfile}
        profileError={w.profileError}
        onQuizSelect={w.handleQuizSelect}
        onSaveProfile={w.handleSaveProfile}
      />
    );
  }

  // -- NO ACTIVE PLAN --
  if (!w.activePlan) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
        <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
        <header className="px-5 py-3">
          <h1 className="text-xl font-bold text-green-900">Workouts</h1>
        </header>

        {/* Profile summary card */}
        {w.fitnessProfile && (
          <section className="px-5 mt-2">
            <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-700">Your preferences</p>
                <p className="text-sm text-gray-500 mt-0.5 capitalize">
                  {w.fitnessProfile.goal.replace(/_/g, " ")} {"\u00b7"} {w.fitnessProfile.experience_level} {"\u00b7"}{" "}
                  {w.fitnessProfile.days_per_week}{"\u00d7"}/week {"\u00b7"} {w.fitnessProfile.session_duration_minutes} min
                </p>
              </div>
              <button
                onClick={() => { w.setQuizMode(true); w.setQuizStep(0); }}
                className="text-xs text-green-600 font-medium ml-4 flex-shrink-0"
              >
                Edit
              </button>
            </div>
          </section>
        )}

        <section className="px-5 mt-6 text-center">
          <div className="text-6xl mb-3">{"\ud83c\udfcb\ufe0f"}</div>
          <h2 className="text-xl font-bold text-green-900 mb-2">Ready to train?</h2>
          <p className="text-sm text-gray-500 mb-2 max-w-xs mx-auto">
            Get a personalized 6-week program tailored to your goals and schedule.
          </p>
          <p className="text-xs text-gray-400 italic mb-5 max-w-xs mx-auto">
            Plans are AI-generated and should be used as a guide. Consult a professional for specific medical needs.
          </p>
          {w.planError && <p className="text-red-500 text-sm mb-3">{w.planError}</p>}
          <button
            onClick={w.handleGeneratePlan}
            disabled={w.generatingPlan}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {w.generatingPlan ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating your plan\u2026
              </>
            ) : (
              "\u2728 Generate My 6-Week Plan"
            )}
          </button>
        </section>

        {/* Quick log */}
        <section className="px-5 mt-8">
          <button
            onClick={() => w.setQuickLogOpen((o: boolean) => !o)}
            className="flex items-center justify-between w-full"
          >
            <h2 className="text-base font-bold text-green-900">Quick Log a Workout</h2>
            {w.quickLogOpen ? (
              <ChevronUp className="w-4 h-4 text-green-700" />
            ) : (
              <ChevronDown className="w-4 h-4 text-green-700" />
            )}
          </button>
          {w.quickLogOpen && (
            <form onSubmit={w.handleManualLog} className="mt-3 bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <input
                value={w.manualName}
                onChange={(e) => w.setManualName(e.target.value)}
                placeholder="Workout name, e.g. Push Day"
                className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              <textarea
                value={w.manualNotes}
                onChange={(e) => w.setManualNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              />
              {w.manualError && <p className="text-red-500 text-sm">{w.manualError}</p>}
              {w.manualSuccess && <p className="text-green-600 text-sm font-medium">Workout logged!</p>}
              <button
                type="submit"
                disabled={w.loggingManual || !w.manualName.trim()}
                className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-medium shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {w.loggingManual ? "Saving\u2026" : "Log Workout"}
              </button>
            </form>
          )}
        </section>

        <BottomNav />
      </div>
    );
  }

  // -- ACTIVE PLAN VIEW --
  if (w.activePlan.weeks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
        <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
        <header className="px-5 py-3">
          <h1 className="text-xl font-bold text-green-900">Workouts</h1>
        </header>
        <section className="px-5 mt-8 text-center">
          <div className="text-4xl mb-3">{"\u26a0\ufe0f"}</div>
          <p className="text-gray-600 mb-4">Your plan didn't generate correctly. Please try again.</p>
          {w.planError && <p className="text-red-500 text-sm mb-3">{w.planError}</p>}
          <button
            onClick={w.handleGeneratePlan}
            disabled={w.generatingPlan}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {w.generatingPlan ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Generating\u2026</>
            ) : (
              "\u2728 Try Again"
            )}
          </button>
        </section>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
      <header className="px-5 py-3">
        <h1 className="text-xl font-bold text-green-900">Workouts</h1>
      </header>

      <WorkoutPlanView
        activePlan={w.activePlan}
        fitnessProfile={w.fitnessProfile}
        expandedWeek={w.expandedWeek}
        setExpandedWeek={w.setExpandedWeek}
        expandedSession={w.expandedSession}
        setExpandedSession={w.setExpandedSession}
        completingSession={w.completingSession}
        toggleToast={w.toggleToast}
        abandoningPlan={w.abandoningPlan}
        abandonError={w.abandonError}
        showAbandonConfirm={w.showAbandonConfirm}
        setShowAbandonConfirm={w.setShowAbandonConfirm}
        onCompleteSession={w.handleCompleteSession}
        onAbandonPlan={w.handleAbandonPlan}
      />

      {/* Quick log (collapsible) */}
      <section className="px-5 mt-6">
        <button
          onClick={() => w.setQuickLogOpen((o: boolean) => !o)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="text-base font-bold text-green-900">Quick Log a Workout</h2>
          {w.quickLogOpen ? (
            <ChevronUp className="w-4 h-4 text-green-700" />
          ) : (
            <ChevronDown className="w-4 h-4 text-green-700" />
          )}
        </button>
        {w.quickLogOpen && (
          <form onSubmit={w.handleManualLog} className="mt-3 bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <input
              value={w.manualName}
              onChange={(e) => w.setManualName(e.target.value)}
              placeholder="Workout name, e.g. Push Day"
              className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <textarea
              value={w.manualNotes}
              onChange={(e) => w.setManualNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
            />
            {w.manualError && <p className="text-red-500 text-sm">{w.manualError}</p>}
            {w.manualSuccess && <p className="text-green-600 text-sm font-medium">Workout logged!</p>}
            <button
              type="submit"
              disabled={w.loggingManual || !w.manualName.trim()}
              className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-medium shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {w.loggingManual ? "Saving\u2026" : "Log Workout"}
            </button>
          </form>
        )}
      </section>

      <BottomNav />
    </div>
  );
}
