"use client";
import { ArrowLeft, Scale, Activity, Utensils, Brain, TrendingUp, Clock, CheckCircle, Lightbulb, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import BottomNav from "../../components/BottomNav";

export default function HowANIWorksPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50 pb-24">
      <div style={{ height: "max(24px, env(safe-area-inset-top))" }} />

      {/* Header */}
      <header className="px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/ani")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 border border-amber-200 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-amber-700" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-amber-900">How ANI Works</h1>
          <p className="text-xs text-gray-500">Your adaptive nutrition engine</p>
        </div>
      </header>

      <div className="px-5 space-y-4 mt-2">

        {/* 1. What is ANI? */}
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-gray-900">What is ANI?</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            ANI (Adaptive Nutrition Intelligence) is your personal nutrition engine.
            It watches your weight trend, tracks your energy balance, and cross-references
            your food logs to automatically adjust your calorie and macro targets every week.
            Instead of relying on a static calculator, ANI learns from your real-world data
            and adapts as your body does.
          </p>
        </section>

        {/* 2. The Three Signals */}
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-gray-900">The Three Signals</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            ANI uses a priority hierarchy. The most reliable signal always wins.
          </p>

          {/* Signal 1 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-green-700">Primary Signal</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Weight Trend</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The scale is ground truth. ANI looks at your 7-day weight trend first.
              If you&rsquo;re losing too fast, too slow, or in the wrong direction, this
              signal drives the adjustment. If the weekly data is noisy, ANI falls back
              to your 30-day trend.
            </p>
          </div>

          {/* Signal 2 */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">Secondary Signal</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Energy Balance</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              ANI estimates your total daily energy expenditure (NEAT + exercise calories)
              and compares it to your logged food intake. This helps ANI understand
              <em> why</em> the scale is moving the way it is and make smarter adjustments.
            </p>
          </div>

          {/* Signal 3 */}
          <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Supporting Signal</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Logged Food</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your food logs are cross-referenced against the scale. If your logged
              calories say you should be losing weight but the scale disagrees, ANI
              trusts the scale and adjusts accordingly. This keeps things honest even
              if logging isn&rsquo;t perfect.
            </p>
          </div>
        </section>

        {/* 3. How ANI Makes Adjustments */}
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-gray-900">How ANI Makes Adjustments</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Every week, ANI runs through a clear decision process:
          </p>
          <div className="space-y-3">
            {[
              { step: "1", text: "Collects the last 7 days of weight, food, and activity data" },
              { step: "2", text: "Evaluates your weight trend first \u2014 is it moving in the right direction?" },
              { step: "3", text: "Checks your energy balance \u2014 does intake vs. expenditure explain the trend?" },
              { step: "4", text: "Cross-references with logged food \u2014 are the numbers consistent?" },
              { step: "5", text: "Applies small adjustments (max 10% per week) to keep changes gradual and sustainable" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-amber-700">{item.step}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. The "Good Enough" Philosophy */}
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-gray-900">The &ldquo;Good Enough&rdquo; Philosophy</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            ANI doesn&rsquo;t expect you to hit your targets exactly every day. Close
            is good enough. What matters is whether your weight is moving in the right
            direction at the right pace. If the trend is right, ANI stays the course
            even if daily numbers fluctuate. This takes the pressure off and keeps
            nutrition sustainable.
          </p>
        </section>

        {/* 5. How ANI Learns Over Time */}
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-gray-900">How ANI Learns Over Time</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Each week, ANI refines its estimate of your NEAT (non-exercise activity
            thermogenesis) &mdash; the calories your body burns just going about your day.
            Standard calculators guess this number once. ANI continuously updates it
            based on what the scale actually shows.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            The more data you give ANI, the smarter it gets. After a few weeks, its
            NEAT estimate becomes highly personalized, and its calorie targets get
            more and more accurate for <em>your</em> body.
          </p>
        </section>

        {/* 6. Tips for Best Results */}
        <section className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-amber-900">Tips for Best Results</h2>
          </div>
          <div className="space-y-3">
            {[
              { title: "Log consistently", detail: "Even rough estimates help. ANI cross-checks everything against the scale, so perfection isn\u2019t required." },
              { title: "Weigh in at least 2x per week", detail: "More data points mean a cleaner trend. Morning weigh-ins before eating give the most consistent readings." },
              { title: "Trust the process", detail: "ANI makes small, gradual adjustments. Give it 2\u20133 weeks before expecting big changes \u2014 slow and steady wins." },
              { title: "Don\u2019t chase daily numbers", detail: "Weight fluctuates daily. ANI looks at the trend, not any single day. You should too." },
            ].map((tip) => (
              <div key={tip.title} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{tip.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{tip.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <BottomNav />
    </div>
  );
}
