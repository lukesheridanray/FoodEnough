"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";
import { QUIZ_STEPS } from "../components/FitnessQuiz";

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
  estimated_calories?: number;
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

export type { FitnessProfile, Exercise, PlanSession, PlanWeek, ActivePlan };

export function useWorkouts() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [fitnessProfile, setFitnessProfile] = useState<FitnessProfile | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);

  const [quizMode, setQuizMode] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [limitations, setLimitations] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState("");

  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [completingSession, setCompletingSession] = useState<number | null>(null);
  const [abandoningPlan, setAbandoningPlan] = useState(false);
  const [abandonError, setAbandonError] = useState("");
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [loggingManual, setLoggingManual] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState(false);

  const handleUnauthorized = () => {
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
      const res = await apiFetch("/workout-plans/active");
      const data = await res.json().catch(() => ({}));
      if (data.plan) {
        setActivePlan(data.plan);
        setExpandedWeek(findCurrentWeek(data.plan));
      } else {
        setActivePlan(null);
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      // non-fatal
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    const init = async () => {
      try {
        const [profileRes, planRes] = await Promise.all([
          apiFetch("/fitness-profile"),
          apiFetch("/workout-plans/active"),
        ]);

        const profileData = await profileRes.json().catch(() => ({}));
        const planData = await planRes.json().catch(() => ({}));

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
      } catch (err) {
        if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
        // non-fatal
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const lastQuizStepIndex = QUIZ_STEPS.length - 1;

  const handleQuizSelect = (key: string, value: any) => {
    const updated = { ...quizAnswers, [key]: value };
    setQuizAnswers(updated);
    if (quizStep < lastQuizStepIndex) {
      setQuizStep((s) => s + 1);
    } else {
      setQuizStep(QUIZ_STEPS.length);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError("");
    try {
      const body = { ...quizAnswers, limitations: limitations.trim() || null };
      const res = await apiFetch("/fitness-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setFitnessProfile(body as FitnessProfile);
        setQuizMode(false);
        setQuizStep(0);
      } else {
        setProfileError("Failed to save preferences. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setProfileError("Connection failed. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    setPlanError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await apiFetch("/workout-plans/generate", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPlanError(err.detail || "Failed to generate plan. Please try again.");
        return;
      }
      await loadActivePlan();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
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
      const tzOffset = new Date().getTimezoneOffset() * -1;
      const res = await apiFetch(`/plan-sessions/${sessionId}/complete?tz_offset_minutes=${tzOffset}`, { method: "PUT" });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const estimatedCalories = data.estimated_calories || 0;
        setActivePlan((prev) => {
          if (!prev) return prev;
          const now = new Date().toISOString();
          const updatedWeeks = prev.weeks.map((w) => ({
            ...w,
            sessions: w.sessions.map((s) =>
              s.id === sessionId ? { ...s, is_completed: true, completed_at: now, estimated_calories: estimatedCalories } : s
            ),
          }));
          const completedCount = updatedWeeks
            .flatMap((w) => w.sessions)
            .filter((s) => s.is_completed).length;
          return { ...prev, weeks: updatedWeeks, completed_sessions: completedCount };
        });
        loadActivePlan();
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
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
      const res = await apiFetch(`/workout-plans/${activePlan.id}`, { method: "DELETE" });
      if (res.ok) {
        setActivePlan(null);
        setShowAbandonConfirm(false);
      } else {
        setAbandonError("Failed to abandon plan. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
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
      const res = await apiFetch("/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: manualName.trim(), notes: manualNotes.trim() || null }),
      });
      if (res.ok) {
        setManualName("");
        setManualNotes("");
        setManualSuccess(true);
        setTimeout(() => setManualSuccess(false), 3000);
      } else {
        setManualError("Failed to log workout.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setManualError("Connection failed. Please try again.");
    } finally {
      setLoggingManual(false);
    }
  };

  return {
    loading,
    fitnessProfile,
    activePlan,
    quizMode,
    setQuizMode,
    quizStep,
    setQuizStep,
    quizAnswers,
    limitations,
    setLimitations,
    savingProfile,
    profileError,
    generatingPlan,
    planError,
    expandedWeek,
    setExpandedWeek,
    expandedSession,
    setExpandedSession,
    completingSession,
    abandoningPlan,
    abandonError,
    showAbandonConfirm,
    setShowAbandonConfirm,
    quickLogOpen,
    setQuickLogOpen,
    manualName,
    setManualName,
    manualNotes,
    setManualNotes,
    loggingManual,
    manualError,
    manualSuccess,
    handleQuizSelect,
    handleSaveProfile,
    handleGeneratePlan,
    handleCompleteSession,
    handleAbandonPlan,
    handleManualLog,
  };
}
