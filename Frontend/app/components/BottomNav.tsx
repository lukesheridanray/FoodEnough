"use client";

import { Home, BarChart2, Dumbbell, User } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { id: "home", icon: <Home />, label: "Home", href: "/" },
    { id: "macros", icon: <BarChart2 />, label: "Macros", href: "/diary" },
    { id: "workouts", icon: <Dumbbell />, label: "Workouts", href: "/workouts" },
    { id: "profile", icon: <User />, label: "Profile", href: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-md flex justify-around items-center py-3 shadow-md">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.href)}
          className={`flex flex-col items-center text-sm transition-colors ${
            pathname === tab.href ? "text-green-700" : "text-gray-400"
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
