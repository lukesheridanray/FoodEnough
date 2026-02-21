"use client";

import { Home, BarChart2, Dumbbell, User } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { id: "home", icon: Home, label: "Home", href: "/" },
    { id: "macros", icon: BarChart2, label: "Macros", href: "/diary" },
    { id: "workouts", icon: Dumbbell, label: "Workouts", href: "/workouts" },
    { id: "profile", icon: User, label: "Profile", href: "/profile" },
  ];

  return (
    <nav role="navigation" aria-label="Main navigation" className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-around items-center py-2 shadow-lg"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => router.push(tab.href)}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center gap-0.5 px-4 py-1 transition-all"
          >
            <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-green-100" : ""}`}>
              <Icon className={`w-5 h-5 transition-colors ${active ? "text-green-700" : "text-gray-400"}`} />
            </div>
            <span className={`text-xs font-medium transition-colors ${active ? "text-green-700" : "text-gray-400"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
