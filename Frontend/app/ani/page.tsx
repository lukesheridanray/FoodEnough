"use client";
import BottomNav from "../components/BottomNav";
import ANIDashboard from "../components/ANIDashboard";
import PremiumGate from "../components/PremiumGate";
import { useANI } from "../hooks/useANI";
import { Brain } from "lucide-react";

export default function ANIPage() {
  const ani = useANI();

  if (ani.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
        <div style={{ height: "max(24px, env(safe-area-inset-top))" }} />
        <header className="px-5 py-3">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
        </header>
        <section className="px-5 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
        </section>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 pb-24">
      <div style={{ height: "max(24px, env(safe-area-inset-top))" }} />
      <header className="px-5 py-3">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-green-700" />
          <h1 className="text-xl font-bold text-green-900">Nutrition Intelligence</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Adaptive goals powered by your data</p>
      </header>

      <PremiumGate isPremium={ani.isPremium}>
        <ANIDashboard
          targets={ani.targets}
          history={ani.history}
          insights={ani.insights}
          recalibrating={ani.recalibrating}
          recalError={ani.recalError}
          onRecalibrate={ani.triggerRecalibration}
        />
      </PremiumGate>

      <BottomNav />
    </div>
  );
}
