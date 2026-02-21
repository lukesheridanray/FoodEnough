"use client";

interface HealthSurveyProps {
  surveyStep: number;
  setSurveyStep: (step: number) => void;
  sex: "M" | "F" | "";
  setSex: (sex: "M" | "F" | "") => void;
  age: string;
  setAge: (age: string) => void;
  heightFt: string;
  setHeightFt: (ft: string) => void;
  heightIn: string;
  setHeightIn: (inches: string) => void;
  surveyWeight: string;
  setSurveyWeight: (w: string) => void;
  weightUnit: 'lbs' | 'kg';
  toggleWeightUnit: (unit: 'lbs' | 'kg') => void;
  activityLevel: string;
  setActivityLevel: (level: string) => void;
  goalType: "lose" | "maintain" | "gain";
  setGoalType: (type: "lose" | "maintain" | "gain") => void;
  calculating: boolean;
  calcError: string;
  onCalculateGoals: () => void;
}

export default function HealthSurvey({
  surveyStep,
  setSurveyStep,
  sex,
  setSex,
  age,
  setAge,
  heightFt,
  setHeightFt,
  heightIn,
  setHeightIn,
  surveyWeight,
  setSurveyWeight,
  weightUnit,
  toggleWeightUnit,
  activityLevel,
  setActivityLevel,
  goalType,
  setGoalType,
  calculating,
  calcError,
  onCalculateGoals,
}: HealthSurveyProps) {
  return (
    <section className="px-5 mt-6">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= surveyStep ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step 0 -- Sex */}
        {surveyStep === 0 && (
          <div>
            <h2 className="text-base font-bold text-green-900 mb-1">Let's set your goals</h2>
            <p className="text-sm text-gray-500 mb-4">What's your biological sex?</p>
            <div className="flex gap-3">
              {(["M", "F"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSex(s); setSurveyStep(1); }}
                  className={`flex-1 py-4 text-sm font-semibold rounded-2xl border-2 transition-all ${
                    sex === s ? "border-green-500 text-green-700 bg-green-50" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s === "M" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 -- Age + Height */}
        {surveyStep === 1 && (
          <div>
            <h2 className="text-base font-bold text-green-900 mb-1">Your stats</h2>
            <p className="text-sm text-gray-500 mb-4">We use these to calculate your metabolism accurately.</p>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 28"
                  min={10} max={100}
                  className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Height</label>
                <div className="flex gap-2 mt-1.5">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                      placeholder="5"
                      min={3} max={8}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-7 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">ft</span>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      placeholder="10"
                      min={0} max={11}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-7 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">in</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => { if (age && heightFt) setSurveyStep(2); }}
              disabled={!age || !heightFt}
              className="w-full py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-40"
            >
              Continue {"\u2192"}
            </button>
            <button onClick={() => setSurveyStep(0)} className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600">
              {"\u2190"} Back
            </button>
          </div>
        )}

        {/* Step 2 -- Weight */}
        {surveyStep === 2 && (
          <div>
            <h2 className="text-base font-bold text-green-900 mb-1">Your current weight</h2>
            <p className="text-sm text-gray-500 mb-4">Used to calculate your calorie needs. This will be logged to your weight history.</p>
            <div className="flex gap-2 mb-2">
              {(['lbs', 'kg'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => toggleWeightUnit(u)}
                  className={`flex-1 py-2 text-sm font-medium rounded-xl border-2 transition-all ${
                    weightUnit === u ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="number"
                value={surveyWeight}
                onChange={(e) => setSurveyWeight(e.target.value)}
                placeholder={weightUnit === 'lbs' ? "e.g. 175" : "e.g. 79"}
                min={50} max={700}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 pr-12 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-center text-lg font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{weightUnit}</span>
            </div>
            <button
              onClick={() => { if (surveyWeight) setSurveyStep(3); }}
              disabled={!surveyWeight}
              className="mt-4 w-full py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-40"
            >
              Continue {"\u2192"}
            </button>
            <button onClick={() => setSurveyStep(1)} className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600">
              {"\u2190"} Back
            </button>
          </div>
        )}

        {/* Step 3 -- Activity */}
        {surveyStep === 3 && (
          <div>
            <h2 className="text-base font-bold text-green-900 mb-1">Activity level</h2>
            <p className="text-sm text-gray-500 mb-3">How active are you on a typical week?</p>
            <div className="space-y-2">
              {[
                { value: "sedentary",   label: "Sedentary",          desc: "Desk job, little/no exercise" },
                { value: "light",       label: "Lightly active",     desc: "Exercise 1\u20133 days/week" },
                { value: "moderate",    label: "Moderately active",  desc: "Exercise 3\u20135 days/week" },
                { value: "active",      label: "Very active",        desc: "Hard exercise 6\u20137 days/week" },
                { value: "very_active", label: "Extra active",       desc: "Physical job + daily training" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setActivityLevel(opt.value); setSurveyStep(4); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    activityLevel === opt.value
                      ? "border-green-500 bg-green-50"
                      : "border-gray-100 hover:border-green-200"
                  }`}
                >
                  <span className={`text-sm font-medium ${activityLevel === opt.value ? "text-green-700" : "text-gray-700"}`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">{opt.desc}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setSurveyStep(2)} className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600">
              {"\u2190"} Back
            </button>
          </div>
        )}

        {/* Step 4 -- Goal + Calculate */}
        {surveyStep === 4 && (
          <div>
            <h2 className="text-base font-bold text-green-900 mb-1">What's your goal?</h2>
            <p className="text-sm text-gray-500 mb-3">We'll tailor your calorie and macro targets to this.</p>
            <div className="space-y-2 mb-4">
              {([
                { value: "lose",     label: "Lose weight",  desc: "500 kcal deficit \u00b7 preserve muscle", color: "border-blue-400 bg-blue-50 text-blue-700" },
                { value: "maintain", label: "Maintain",     desc: "Eat at your TDEE",                   color: "border-green-500 bg-green-50 text-green-700" },
                { value: "gain",     label: "Build muscle", desc: "300 kcal surplus \u00b7 high protein",     color: "border-orange-400 bg-orange-50 text-orange-700" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGoalType(opt.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    goalType === opt.value ? opt.color : "border-gray-100 hover:border-gray-200 text-gray-700"
                  }`}
                >
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="text-xs text-gray-400 ml-2">{opt.desc}</span>
                </button>
              ))}
            </div>
            {calcError && <p className="text-red-500 text-xs mb-2">{calcError}</p>}
            <button
              onClick={onCalculateGoals}
              disabled={calculating}
              className="w-full py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {calculating ? <><span className="animate-spin inline-block">{"\u27f3"}</span> Calculating\u2026</> : "Calculate My Goals \u2192"}
            </button>
            <button onClick={() => setSurveyStep(3)} className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600">
              {"\u2190"} Back
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
