"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, authHeaders } from "../../lib/auth";
import { API_URL } from "../../lib/config";
import BottomNav from "../components/BottomNav";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface FitnessProfile {
  gym_access: string;
  goal: string;
  experience_level: string;
  days_per_week: number;
  session_duration_minutes: number;
  limitations: string | null;
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

interface PlanSession {
  id: number;
  day_number: number;
  name: string;
  exercises: Exercise[];
  is_completed: boolean;
  completed_at: string | null;
}

interface PlanWeek {
  week_number: number;
  sessions: PlanSession[];
}

interface ActivePlan {
  id: number;
  name: string;
  notes: string | null;
  total_weeks: number;
  created_at: string;
  total_sessions: number;
  completed_sessions: number;
  weeks: PlanWeek[];
}

const QUIZ_STEPS = [
  {
    key: "gym_access",
    question: "Where do you work out?",
    options: [
      { value: "full_gym", label: "🏋️ Full gym", description: "Barbells, machines & cables" },
      { value: "home_gym", label: "🏠 Home gym", description: "Dumbbells & resistance bands" },
      { value: "bodyweight", label: "🤸 Bodyweight only", description: "No equipment needed" },
    ],
  },
  {
    key: "goal",
    question: "What's your main goal?",
    options: [
      { value: "build_muscle", label: "💪 Build muscle", description: "Hypertrophy & strength" },
      { value: "lose_weight", label: "🔥 Lose weight", description: "Fat loss & body composition" },
      { value: "improve_cardio", label: "🏃 Improve cardio", description: "Endurance & fitness" },
      { value: "general_fitness", label: "⚡ General fitness", description: "Overall health & wellbeing" },
    ],
  },
  {
    key: "experience_level",
    question: "How experienced are you?",
    options: [
      { value: "beginner", label: "🌱 Beginner", description: "Less than 1 year training" },
      { value: "intermediate", label: "⚡ Intermediate", description: "1–3 years training" },
      { value: "advanced", label: "🔥 Advanced", description: "3+ years training" },
    ],
  },
  {
    key: "days_per_week",
    question: "How many days per week?",
    options: [
      { value: 3, label: "3 days", description: "Mon / Wed / Fri" },
      { value: 4, label: "4 days", description: "Mon / Tue / Thu / Fri" },
      { value: 5, label: "5 days", description: "Mon through Fri" },
      { value: 6, label: "6 days", description: "Mon through Sat" },
    ],
  },
  {
    key: "session_duration_minutes",
    question: "How long per session?",
    options: [
      { value: 30, label: "30 min", description: "Quick & efficient" },
      { value: 45, label: "45 min", description: "Standard session" },
      { value: 60, label: "60 min", description: "Full session" },
      { value: 90, label: "90 min", description: "Extended training" },
    ],
  },
];

const DAY_NAMES: Record<number, string[]> = {
  3: ["Mon", "Wed", "Fri"],
  4: ["Mon", "Tue", "Thu", "Fri"],
  5: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  6: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

function getDayLabel(dayNumber: number, daysPerWeek: number): string {
  const names = DAY_NAMES[daysPerWeek];
  if (names && dayNumber >= 1 && dayNumber <= names.length) {
    return names[dayNumber - 1];
  }
  return `Day ${dayNumber}`;
}

export default function WorkoutsPage() {
  const router = useRouter();

  // Data
  const [loading, setLoading] = useState(true);
  const [fitnessProfile, setFitnessProfile] = useState<FitnessProfile | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);

  // Quiz state
  const [quizMode, setQuizMode] = useState(false);
  const [quizStep, setQuizStep] = useState(0); // 0–4 = option questions, 5 = limitations
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [limitations, setLimitations] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Plan generation
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState("");

  // Plan UI
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [completingSession, setCompletingSession] = useState<number | null>(null);
  const [abandoningPlan, setAbandoningPlan] = useState(false);
  const [abandonError, setAbandonError] = useState("");
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // Quick log
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [loggingManual, setLoggingManual] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState(false);

  const handleUnauthorized = () => {
    removeToken();
    router.push("/login");
  };

  const findCurrentWeek = (plan: ActivePlan): number => {
    for (const week of plan.weeks) {
      if (week.sessions.some((s) => !s.is_completed)) return week.week_number;
    }
    return plan.weeks[plan.weeks.length - 1]?.week_number ?? 1;
  };

  const loadActivePlan = async () => {
    try {
      const res = await fetch(`${API_URL}/workout-plans/active`, { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const data = await res.json();
      if (data.plan) {
        setActivePlan(data.plan);
        setExpandedWeek(findCurrentWeek(data.plan));
      } else {
        setActivePlan(null);
      }
    } catch {
      // non-fatal — plan was likely generated; user will see it on next load
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    const init = async () => {
      try {
        const [profileRes, planRes] = await Promise.all([
          fetch(`${API_URL}/fitness-profile`, { headers: authHeaders() }),
          fetch(`${API_URL}/workout-plans/active`, { headers: authHeaders() }),
        ]);
        if (profileRes.status === 401) { handleUnauthorized(); return; }
        if (planRes.status === 401) { handleUnauthorized(); return; }

        const profileData = await profileRes.json();
        const planData = await planRes.json();

        if (profileData.profile) {
          setFitnessProfile(profileData.profile);
          setQuizAnswers(profileData.profile);
          setLimitations(profileData.profile.limitations || "");
        } else {
          setQuizMode(true);
        }

        if (planData.plan) {
          setActivePlan(planData.plan);
          setExpandedWeek(findCurrentWeek(planData.plan));
        }
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleQuizSelect = (key: string, value: any) => {
    const updated = { ...quizAnswers, [key]: value };
    setQuizAnswers(updated);
    if (quizStep < QUIZ_STEPS.length - 1) {
      setQuizStep((s) => s + 1);
    } else {
      setQuizStep(QUIZ_STEPS.length); // advance to limitations step
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError("");
    try {
      const body = { ...quizAnswers, limitations: limitations.trim() || null };
      const res = await fetch(`${API_URL}/fitness-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        setFitnessProfile(body as FitnessProfile);
        setQuizMode(false);
        setQuizStep(0);
      } else {
        setProfileError("Failed to save preferences. Please try again.");
      }
    } catch {
      setProfileError("Connection failed. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    setPlanError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 2-min hard cap
    try {
      const res = await fetch(`${API_URL}/workout-plans/generate`, {
        method: "POST",
        headers: authHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPlanError(err.detail || "Failed to generate plan. Please try again.");
        return;
      }
      await loadActivePlan();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        setPlanError("Generation timed out. Please try again.");
      } else {
        setPlanError("Connection failed. Please try again.");
      }
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleCompleteSession = async (sessionId: number) => {
    setCompletingSession(sessionId);
    try {
      const res = await fetch(`${API_URL}/plan-sessions/${sessionId}/complete`, {
        method: "PUT",
        headers: authHeaders(),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        // Optimistic update: reflect completion immediately so UI isn't stale
        // if the follow-up GET fails
        setActivePlan((prev) => {
          if (!prev) return prev;
          const now = new Date().toISOString();
          const updatedWeeks = prev.weeks.map((w) => ({
            ...w,
            sessions: w.sessions.map((s) =>
              s.id === sessionId ? { ...s, is_completed: true, completed_at: now } : s
            ),
          }));
          const completedCount = updatedWeeks
            .flatMap((w) => w.sessions)
            .filter((s) => s.is_completed).length;
          return { ...prev, weeks: updatedWeeks, completed_sessions: completedCount };
        });
        // Then sync fresh data from server in background
        loadActivePlan();
      }
    } catch {
      // non-fatal
    } finally {
      setCompletingSession(null);
    }
  };

  const handleAbandonPlan = async () => {
    if (!activePlan) return;
    setAbandoningPlan(true);
    setAbandonError("");
    try {
      const res = await fetch(`${API_URL}/workout-plans/${activePlan.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        setActivePlan(null);
        setShowAbandonConfirm(false);
      } else {
        setAbandonError("Failed to abandon plan. Please try again.");
      }
    } catch {
      setAbandonError("Connection failed. Please try again.");
    } finally {
      setAbandoningPlan(false);
    }
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setManualError("");
    setManualSuccess(false);
    setLoggingManual(true);
    try {
      const res = await fetch(`${API_URL}/workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: manualName.trim(), notes: manualNotes.trim() || null }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        setManualName("");
        setManualNotes("");
        setManualSuccess(true);
        setTimeout(() => setManualSuccess(false), 3000);
      } else {
        setManualError("Failed to log workout.");
      }
    } catch {
      setManualError("Connection failed. Please try again.");
    } finally {
      setLoggingManual(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

  // ── QUIZ ──────────────────────────────────────────────────
  if (quizMode) {
    const isLimitationsStep = quizStep === QUIZ_STEPS.length;
    const currentQuestion = !isLimitationsStep ? QUIZ_STEPS[quizStep] : null;
    const progressPct = Math.round(((quizStep + 1) / (QUIZ_STEPS.length + 1)) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
        <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
        <header className="px-5 py-3">
          <h1 className="text-xl font-bold text-green-900">Let's build your plan</h1>
          <p className="text-sm text-gray-500">Answer a few questions to personalize your 6-week program</p>
        </header>

        {/* Progress bar */}
        <div className="px-5 mt-3">
          <div className="h-2 bg-green-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {isLimitationsStep ? "Almost done!" : `Step ${quizStep + 1} of ${QUIZ_STEPS.length + 1}`}
          </p>
        </div>

        <section className="px-5 mt-4">
          {currentQuestion ? (
            <div>
              <h2 className="text-lg font-bold text-green-900 mb-3">{currentQuestion.question}</h2>
              <div className="space-y-3">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => handleQuizSelect(currentQuestion.key, opt.value)}
                    className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
                      quizAnswers[currentQuestion.key] === opt.value
                        ? "border-green-500"
                        : "border-transparent hover:border-green-200"
                    }`}
                  >
                    <div className="font-semibold text-gray-800">{opt.label}</div>
                    <div className="text-sm text-gray-500">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-green-900 mb-1">Any limitations or injuries?</h2>
              <p className="text-sm text-gray-500 mb-3">
                This helps us tailor exercises to keep you safe. Leave blank if none.
              </p>
              <textarea
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                placeholder="e.g. bad knees, shoulder injury, lower back pain"
                rows={3}
                className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              />
              {profileError && <p className="text-red-500 text-sm mt-2">{profileError}</p>}
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="mt-3 w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-60"
              >
                {savingProfile ? "Saving…" : "Save & Continue →"}
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="mt-2 w-full py-2 text-sm text-gray-400 hover:text-gray-600"
              >
                Skip — no limitations
              </button>
            </div>
          )}

          {quizStep > 0 && (
            <button
              onClick={() => setQuizStep((s) => s - 1)}
              className="mt-4 text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          )}
        </section>

        <BottomNav />
      </div>
    );
  }

  // ── NO ACTIVE PLAN ────────────────────────────────────────
  if (!activePlan) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
        <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
        <header className="px-5 py-3">
          <h1 className="text-xl font-bold text-green-900">Workouts</h1>
        </header>

        {/* Profile summary card */}
        {fitnessProfile && (
          <section className="px-5 mt-2">
            <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-700">Your preferences</p>
                <p className="text-sm text-gray-500 mt-0.5 capitalize">
                  {fitnessProfile.goal.replace(/_/g, " ")} · {fitnessProfile.experience_level} ·{" "}
                  {fitnessProfile.days_per_week}×/week · {fitnessProfile.session_duration_minutes} min
                </p>
              </div>
              <button
                onClick={() => { setQuizMode(true); setQuizStep(0); }}
                className="text-xs text-green-600 font-medium ml-4 flex-shrink-0"
              >
                Edit
              </button>
            </div>
          </section>
        )}

        <section className="px-5 mt-6 text-center">
          <div className="text-6xl mb-3">🏋️</div>
          <h2 className="text-xl font-bold text-green-900 mb-2">Ready to train?</h2>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            Get a personalized 6-week program tailored to your goals and schedule.
          </p>
          {planError && <p className="text-red-500 text-sm mb-3">{planError}</p>}
          <button
            onClick={handleGeneratePlan}
            disabled={generatingPlan}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {generatingPlan ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating your plan… (~15s)
              </>
            ) : (
              "✨ Generate My 6-Week Plan"
            )}
          </button>
        </section>

        {/* Quick log */}
        <section className="px-5 mt-8">
          <button
            onClick={() => setQuickLogOpen((o) => !o)}
            className="flex items-center justify-between w-full"
          >
            <h2 className="text-base font-bold text-green-900">Quick Log a Workout</h2>
            {quickLogOpen ? (
              <ChevronUp className="w-4 h-4 text-green-700" />
            ) : (
              <ChevronDown className="w-4 h-4 text-green-700" />
            )}
          </button>
          {quickLogOpen && (
            <form onSubmit={handleManualLog} className="mt-3 bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Workout name, e.g. Push Day"
                className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              <textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              />
              {manualError && <p className="text-red-500 text-sm">{manualError}</p>}
              {manualSuccess && <p className="text-green-600 text-sm font-medium">Workout logged!</p>}
              <button
                type="submit"
                disabled={loggingManual || !manualName.trim()}
                className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-medium shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loggingManual ? "Saving…" : "Log Workout"}
              </button>
            </form>
          )}
        </section>

        <BottomNav />
      </div>
    );
  }

  // ── ACTIVE PLAN VIEW ──────────────────────────────────────
  // Guard: if AI returned a plan with no weeks (bad response), treat as no plan
  if (activePlan.weeks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
        <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
        <header className="px-5 py-3">
          <h1 className="text-xl font-bold text-green-900">Workouts</h1>
        </header>
        <section className="px-5 mt-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-600 mb-4">Your plan didn't generate correctly. Please try again.</p>
          {planError && <p className="text-red-500 text-sm mb-3">{planError}</p>}
          <button
            onClick={handleGeneratePlan}
            disabled={generatingPlan}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {generatingPlan ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Generating… (~15s)</>
            ) : (
              "✨ Try Again"
            )}
          </button>
        </section>
        <BottomNav />
      </div>
    );
  }

  const progressPct =
    activePlan.total_sessions > 0
      ? Math.round((activePlan.completed_sessions / activePlan.total_sessions) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
      <header className="px-5 py-3">
        <h1 className="text-xl font-bold text-green-900">Workouts</h1>
      </header>

      {/* Plan header card */}
      <section className="px-5 mt-2">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="font-bold text-gray-800">{activePlan.name}</h2>
              {activePlan.notes && (
                <p className="text-xs text-gray-500 mt-0.5">{activePlan.notes}</p>
              )}
            </div>
            {!showAbandonConfirm && (
              <button
                onClick={() => setShowAbandonConfirm(true)}
                className="text-xs text-red-400 hover:text-red-600 ml-4 flex-shrink-0"
              >
                Abandon
              </button>
            )}
          </div>
          {showAbandonConfirm && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-600 flex-1">Abandon this plan?</span>
              <button
                onClick={() => setShowAbandonConfirm(false)}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAbandonPlan}
                disabled={abandoningPlan}
                className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-60 flex items-center gap-1"
              >
                {abandoningPlan ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Abandoning…</>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          )}
          {abandonError && <p className="text-red-500 text-xs mt-1">{abandonError}</p>}
          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {activePlan.completed_sessions} / {activePlan.total_sessions} sessions complete · {progressPct}%
          </p>
        </div>
      </section>

      {/* Week accordions */}
      <section className="px-5 mt-4 space-y-3">
        {activePlan.weeks.map((week) => {
          const weekDone = week.sessions.length > 0 && week.sessions.every((s) => s.is_completed);
          const weekStarted = week.sessions.some((s) => s.is_completed);
          const isOpen = expandedWeek === week.week_number;

          return (
            <div key={week.week_number} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Week header button */}
              <button
                onClick={() => {
                  setExpandedWeek(isOpen ? null : week.week_number);
                  setExpandedSession(null);
                }}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  {weekDone ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : weekStarted ? (
                    <div className="w-5 h-5 rounded-full border-2 border-green-400 bg-green-50 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={`font-semibold ${weekDone ? "text-green-700" : "text-gray-800"}`}>
                    Week {week.week_number}
                  </span>
                  <span className="text-xs text-gray-400">
                    {week.sessions.filter((s) => s.is_completed).length}/{week.sessions.length} done
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Session list */}
              {isOpen && (
                <div className="border-t border-gray-50">
                  {week.sessions.map((session) => {
                    const sessExpanded = expandedSession === session.id;
                    return (
                      <div key={session.id} className="border-b border-gray-50 last:border-0">
                        <div className="flex items-center px-4 py-3 gap-2">
                          {session.is_completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                          )}
                          <button
                            onClick={() => setExpandedSession(sessExpanded ? null : session.id)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                {getDayLabel(session.day_number, fitnessProfile?.days_per_week ?? 0)}
                              </span>
                              <span
                                className={`text-sm font-medium ${
                                  session.is_completed ? "text-gray-400 line-through" : "text-gray-800"
                                }`}
                              >
                                {session.name}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {session.exercises.length} exercises
                            </div>
                          </button>
                          {!session.is_completed && (
                            <button
                              onClick={() => handleCompleteSession(session.id)}
                              disabled={completingSession === session.id}
                              className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg font-medium disabled:opacity-60 flex-shrink-0"
                            >
                              {completingSession === session.id ? "…" : "Done ✓"}
                            </button>
                          )}
                        </div>

                        {/* Exercise preview */}
                        {sessExpanded && (
                          <div className="px-4 pb-3 space-y-2">
                            {session.exercises.map((ex, i) => (
                              <div key={i} className="bg-gray-50 rounded-xl p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm font-semibold text-gray-800">{ex.name}</span>
                                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                                    <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                      {ex.sets}×{ex.reps}
                                    </span>
                                    {ex.rest_seconds ? (
                                      <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                        {ex.rest_seconds}s rest
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                {ex.notes && (
                                  <p className="text-xs text-gray-500 mt-1">{ex.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Quick log (collapsible) */}
      <section className="px-5 mt-6">
        <button
          onClick={() => setQuickLogOpen((o) => !o)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="text-base font-bold text-green-900">Quick Log a Workout</h2>
          {quickLogOpen ? (
            <ChevronUp className="w-4 h-4 text-green-700" />
          ) : (
            <ChevronDown className="w-4 h-4 text-green-700" />
          )}
        </button>
        {quickLogOpen && (
          <form onSubmit={handleManualLog} className="mt-3 bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Workout name, e.g. Push Day"
              className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <textarea
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
            />
            {manualError && <p className="text-red-500 text-sm">{manualError}</p>}
            {manualSuccess && <p className="text-green-600 text-sm font-medium">Workout logged!</p>}
            <button
              type="submit"
              disabled={loggingManual || !manualName.trim()}
              className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-medium shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loggingManual ? "Saving…" : "Log Workout"}
            </button>
          </form>
        )}
      </section>

      <BottomNav />
    </div>
  );
}
