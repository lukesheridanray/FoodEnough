"use client";
import BottomNav from "./BottomNav";

export const QUIZ_STEPS = [
  {
    key: "gym_access",
    question: "Where do you work out?",
    options: [
      { value: "full_gym", label: "\ud83c\udfcb\ufe0f Full gym", description: "Barbells, machines & cables" },
      { value: "home_gym", label: "\ud83c\udfe0 Home gym", description: "Dumbbells & resistance bands" },
      { value: "bodyweight", label: "\ud83e\udd38 Bodyweight only", description: "No equipment needed" },
      { value: "kettlebell", label: "\ud83c\udfcb\ufe0f Kettlebell", description: "Kettlebells & minimal equipment" },
    ],
  },
  {
    key: "goal",
    question: "What's your main goal?",
    options: [
      { value: "build_muscle", label: "\ud83d\udcaa Build muscle", description: "Hypertrophy & strength" },
      { value: "lose_weight", label: "\ud83d\udd25 Lose weight", description: "Fat loss & body composition" },
      { value: "improve_cardio", label: "\ud83c\udfc3 Improve cardio", description: "Endurance & fitness" },
      { value: "general_fitness", label: "\u26a1 General fitness", description: "Overall health & wellbeing" },
    ],
  },
  {
    key: "experience_level",
    question: "How experienced are you?",
    options: [
      { value: "beginner", label: "\ud83c\udf31 Beginner", description: "Less than 1 year training" },
      { value: "intermediate", label: "\u26a1 Intermediate", description: "1\u20133 years training" },
      { value: "advanced", label: "\ud83d\udd25 Advanced", description: "3+ years training" },
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

interface FitnessQuizProps {
  quizStep: number;
  setQuizStep: (step: number) => void;
  quizAnswers: Record<string, any>;
  limitations: string;
  setLimitations: (v: string) => void;
  savingProfile: boolean;
  profileError: string;
  onQuizSelect: (key: string, value: any) => void;
  onSaveProfile: () => void;
  hideBottomNav?: boolean;
}

export default function FitnessQuiz({
  quizStep,
  setQuizStep,
  quizAnswers,
  limitations,
  setLimitations,
  savingProfile,
  profileError,
  onQuizSelect,
  onSaveProfile,
  hideBottomNav = false,
}: FitnessQuizProps) {
  const isLimitationsStep = quizStep === QUIZ_STEPS.length;
  const currentQuestion = !isLimitationsStep ? QUIZ_STEPS[quizStep] : null;
  const progressPct = Math.round(((quizStep + 1) / (QUIZ_STEPS.length + 1)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
      <header className="px-5 py-3">
        <h1 className="text-xl font-bold text-green-900">Let's build your plan</h1>
        <p className="text-sm text-gray-500">Answer a few questions to personalize your AI-generated 6-week program</p>
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
                  onClick={() => onQuizSelect(currentQuestion.key, opt.value)}
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
              onClick={onSaveProfile}
              disabled={savingProfile}
              className="mt-3 w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-60"
            >
              {savingProfile ? "Saving\u2026" : "Save & Continue \u2192"}
            </button>
            <button
              onClick={onSaveProfile}
              disabled={savingProfile}
              className="mt-2 w-full py-2 text-sm text-gray-400 hover:text-gray-600"
            >
              Skip {"\u2014"} no limitations
            </button>
          </div>
        )}

        {quizStep > 0 && (
          <button
            onClick={() => setQuizStep(quizStep - 1)}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600"
          >
            {"\u2190"} Back
          </button>
        )}
      </section>

      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
