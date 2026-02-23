"use client";
import { Lock } from "lucide-react";

interface PremiumGateProps {
  isPremium: boolean;
  children: React.ReactNode;
}

export default function PremiumGate({ isPremium, children }: PremiumGateProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="blur-[2px] pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-6 text-center max-w-xs mx-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Premium Feature</h3>
          <p className="text-sm text-gray-500 mb-4">
            Adaptive Nutrition Intelligence analyzes your logs and adjusts your goals weekly.
          </p>
          <button className="w-full py-2.5 px-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors">
            Upgrade to Premium
          </button>
        </div>
      </div>
    </div>
  );
}
