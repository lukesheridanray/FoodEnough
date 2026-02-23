"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getToken, safeSetItem } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";
import HealthSurvey from "../components/HealthSurvey";
import FitnessQuiz from "../components/FitnessQuiz";
import { QUIZ_STEPS } from "../components/FitnessQuiz";

type OnboardingStep = "health" | "offer" | "fitness" | "generating";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("health");

  // ── Health Survey state ──
  const [surveyStep, setSurveyStep] = useState(0);
  const [sex, setSex] = useState<"M" | "F" | "">("");
  const [age, setAge] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightUnit, setHeightUnit] = useState<"imperial" | "metric">("imperial");
  const [heightCm, setHeightCm] = useState("");
  const [surveyWeight, setSurveyWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [activityLevel, setActivityLevel] = useState("");
  const [goalType, setGoalType] = useState<"lose" | "maintain" | "gain">("maintain");
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");

  // ── Fitness Quiz state ──
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [limitations, setLimitations] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // ── Plan generation state ──
  const [genError, setGenError] = useState("");
  const [genSuccess, setGenSuccess] = useState(false);

  // ── Auth guard + already-onboarded guard ──
  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }

    // HIGH #4: Redirect already-onboarded users
    const checkProfile = async () => {
      try {
        const res = await apiFetch("/profile");
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.age && data.sex && data.height_cm && data.activity_level) {
            router.push("/");
          }
        }
      } catch (err) {
        if (err instanceof UnauthorizedError) { router.push("/login"); }
        // non-fatal otherwise
      }
    };
    checkProfile();
  }, []);

  const toggleWeightUnit = (unit: "lbs" | "kg") => {
    setWeightUnit(unit);
    safeSetItem("weightUnit", unit);
  };

  // ── Health Survey handler ──
  const handleCalculateGoals = async () => {
    setCalcError("");
    const computedHeightCm = heightUnit === "metric"
      ? parseFloat(heightCm) || 0
      : heightFt ? (parseInt(heightFt) * 12 + parseInt(heightIn || "0")) * 2.54 : 0;
    if (!age || !sex || !activityLevel) {
      setCalcError("Please fill in all fields above.");
      return;
    }
    if (heightUnit === "imperial" && !heightFt) {
      setCalcError("Please fill in all fields above.");
      return;
    }
    if (heightUnit === "metric" && !heightCm) {
      setCalcError("Please fill in all fields above.");
      return;
    }
    safeSetItem("goalType", goalType);
    setCalculating(true);
    try {
      // CRITICAL #1: Check weight POST response
      if (surveyWeight) {
        const wLbs =
          weightUnit === "kg"
            ? parseFloat(surveyWeight) * 2.20462
            : parseFloat(surveyWeight);
        if (wLbs > 0) {
          const weightRes = await apiFetch("/weight", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weight_lbs: Math.round(wLbs * 10) / 10 }),
          });
          if (!weightRes.ok) {
            console.error("Failed to save weight:", await weightRes.text());
          }
        }
      }
      // Calculate goals
      const res = await apiFetch("/profile/calculate-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: parseInt(age),
          sex,
          height_cm: Math.round(computedHeightCm * 10) / 10,
          activity_level: activityLevel,
          goal_type: goalType,
        }),
      });
      if (res.ok) {
        setStep("offer");
      } else {
        const err = await res.json().catch(() => ({}));
        setCalcError(err.detail || "Calculation failed. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { router.push("/login"); return; }
      setCalcError("Connection failed. Please try again.");
    } finally {
      setCalculating(false);
    }
  };

  // ── Fitness Quiz handlers ──
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
        setStep("generating");
        // CRITICAL #2: await generatePlan() instead of fire-and-forget
        await generatePlan();
      } else {
        setProfileError("Failed to save preferences. Please try again.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) { router.push("/login"); return; }
      setProfileError("Connection failed. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Plan generation ──
  const generatePlan = async () => {
    setGenError("");
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
        setGenError(err.detail || "Failed to generate plan. Please try again.");
        return;
      }
      setGenSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof UnauthorizedError) { router.push("/login"); return; }
      if (err?.name === "AbortError") {
        setGenError("Generation timed out. Please try again.");
      } else {
        setGenError("Connection failed. Please try again.");
      }
    }
  };

  // ── Progress indicator ──
  const stepNumber =
    step === "health" ? 1 : step === "offer" ? 2 : step === "fitness" ? 3 : 3;
  const totalSteps = 3;

  // ── Render ──

  // Fitness Quiz has its own full-page layout, so render it directly
  // HIGH #3: Pass hideBottomNav to FitnessQuiz during onboarding
  if (step === "fitness") {
    return (
      <div className="relative">
        {/* Skip link */}
        <button
          onClick={() => router.push("/")}
          className="absolute top-2 right-4 z-10 text-sm text-gray-400 hover:text-gray-600"
          style={{ top: "max(28px, env(safe-area-inset-top))" }}
        >
          Skip
        </button>
        <FitnessQuiz
          quizStep={quizStep}
          setQuizStep={setQuizStep}
          quizAnswers={quizAnswers}
          limitations={limitations}
          setLimitations={setLimitations}
          savingProfile={savingProfile}
          profileError={profileError}
          onQuizSelect={handleQuizSelect}
          onSaveProfile={handleSaveProfile}
          hideBottomNav
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50">
      <div style={{ height: "max(24px, env(safe-area-inset-top))" }} />

      {/* Header with skip */}
      <header className="px-5 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-green-900">Welcome!</h1>
          <p className="text-sm text-gray-500">
            Step {stepNumber} of {totalSteps}
          </p>
        </div>
        {step !== "generating" && (
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Skip
          </button>
        )}
      </header>

      {/* Step progress bar */}
      <div className="px-5">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i < stepNumber ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Step: Health Survey ── */}
      {step === "health" && (
        <HealthSurvey
          surveyStep={surveyStep}
          setSurveyStep={setSurveyStep}
          sex={sex}
          setSex={setSex}
          age={age}
          setAge={setAge}
          heightFt={heightFt}
          setHeightFt={setHeightFt}
          heightIn={heightIn}
          setHeightIn={setHeightIn}
          heightUnit={heightUnit}
          setHeightUnit={setHeightUnit}
          heightCm={heightCm}
          setHeightCm={setHeightCm}
          surveyWeight={surveyWeight}
          setSurveyWeight={setSurveyWeight}
          weightUnit={weightUnit}
          toggleWeightUnit={toggleWeightUnit}
          activityLevel={activityLevel}
          setActivityLevel={setActivityLevel}
          goalType={goalType}
          setGoalType={setGoalType}
          calculating={calculating}
          calcError={calcError}
          onCalculateGoals={handleCalculateGoals}
        />
      )}

      {/* ── Step: Workout Plan Offer ── */}
      {step === "offer" && (
        <section className="px-5 mt-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="text-4xl mb-3">💪</div>
            <h2 className="text-lg font-bold text-green-900 mb-2">
              Would you like a personalized workout plan?
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Answer a few questions and AI will generate a custom 6-week program
              tailored to your goals. AI-generated plans are a starting point — adjust based on how you feel.
            </p>
            <button
              onClick={() => setStep("fitness")}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Yes, set me up
            </button>
            <button
              onClick={() => router.push("/")}
              className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600"
            >
              Maybe later
            </button>
          </div>
        </section>
      )}

      {/* ── Step: Generating Plan ── */}
      {step === "generating" && (
        <section className="px-5 mt-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            {genError ? (
              <>
                <div className="text-4xl mb-3">⚠️</div>
                <h2 className="text-lg font-bold text-red-700 mb-2">
                  Something went wrong
                </h2>
                <p className="text-sm text-red-500 mb-4">{genError}</p>
                <button
                  onClick={() => {
                    setGenError("");
                    generatePlan();
                  }}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-semibold rounded-xl shadow-md"
                >
                  Try again
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600"
                >
                  Skip for now
                </button>
              </>
            ) : genSuccess ? (
              <>
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-lg font-bold text-green-900 mb-2">
                  Your plan is ready!
                </h2>
                <p className="text-sm text-gray-500">
                  Redirecting you to the app...
                </p>
                <p className="text-xs text-gray-400 italic mt-2">
                  This is an AI-generated plan. Listen to your body and adjust as needed.
                </p>
              </>
            ) : (
              <>
                <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto mb-3" />
                <h2 className="text-lg font-bold text-green-900 mb-2">
                  Building your plan...
                </h2>
                <p className="text-sm text-gray-500">
                  AI is building a personalized program based on your answers.
                </p>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
