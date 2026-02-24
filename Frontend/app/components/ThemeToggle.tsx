"use client";

import { useState, useEffect } from "react";

const WHIMSICAL_STYLES = `
  /* ===== WHIMSICAL THEME OVERRIDES ===== */
  :root[data-theme="whimsical"] {
    --background: #fdf6ee;
    --foreground: #1a3a2a;
  }

  [data-theme="whimsical"] body {
    font-family: 'Nunito', 'Inter', system-ui, sans-serif;
    background: linear-gradient(135deg, #fdf6ee 0%, #f9f0e3 50%, #fef9f3 100%) !important;
    color: #1a3a2a !important;
  }

  /* — Cards & Containers — */
  [data-theme="whimsical"] .bg-white {
    background: #fffcf7 !important;
    border-radius: 1.25rem !important;
    border-color: #e8ddd0 !important;
  }

  [data-theme="whimsical"] .rounded-2xl,
  [data-theme="whimsical"] .rounded-xl {
    border-radius: 1.5rem !important;
  }

  [data-theme="whimsical"] .rounded-lg {
    border-radius: 1rem !important;
  }

  /* — Primary green → deep forest green — */
  [data-theme="whimsical"] .bg-gradient-to-r.from-green-600,
  [data-theme="whimsical"] .bg-gradient-to-r.from-green-500 {
    background: linear-gradient(135deg, #2d6a4f, #40916c) !important;
  }

  [data-theme="whimsical"] .bg-green-600,
  [data-theme="whimsical"] .bg-green-500 {
    background-color: #2d6a4f !important;
  }

  [data-theme="whimsical"] .text-green-700,
  [data-theme="whimsical"] .text-green-600 {
    color: #2d6a4f !important;
  }

  [data-theme="whimsical"] .text-green-900 {
    color: #1b4332 !important;
  }

  [data-theme="whimsical"] .bg-green-100,
  [data-theme="whimsical"] .bg-green-50 {
    background-color: #d8f3dc !important;
  }

  [data-theme="whimsical"] .border-green-300 {
    border-color: #95d5b2 !important;
  }

  [data-theme="whimsical"] .from-green-100 {
    --tw-gradient-from: #d8f3dc !important;
  }

  [data-theme="whimsical"] .to-green-50,
  [data-theme="whimsical"] .to-white {
    --tw-gradient-to: #fdf6ee !important;
  }

  [data-theme="whimsical"] .from-green-50 {
    --tw-gradient-from: #edf6e8 !important;
  }

  /* — Coral accent (replaces some blue accents) — */
  [data-theme="whimsical"] .bg-gradient-to-br.from-green-500 {
    background: linear-gradient(135deg, #2d6a4f, #52b788) !important;
  }

  /* — Lavender secondary — */
  [data-theme="whimsical"] .bg-gray-100 {
    background-color: #f0ebf8 !important;
  }

  [data-theme="whimsical"] .bg-gray-50 {
    background-color: #f7f4fc !important;
  }

  [data-theme="whimsical"] .border-gray-100 {
    border-color: #e5ddf0 !important;
  }

  [data-theme="whimsical"] .border-gray-200 {
    border-color: #d9d0e8 !important;
  }

  [data-theme="whimsical"] .text-gray-400 {
    color: #9b8fb5 !important;
  }

  [data-theme="whimsical"] .text-gray-500 {
    color: #7a6d94 !important;
  }

  [data-theme="whimsical"] .text-gray-600 {
    color: #5c4f73 !important;
  }

  [data-theme="whimsical"] .text-gray-900 {
    color: #1a3a2a !important;
  }

  /* — Buttons: bouncy animations — */
  [data-theme="whimsical"] button {
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  }

  [data-theme="whimsical"] button:active:not(:disabled) {
    transform: scale(0.95) !important;
  }

  [data-theme="whimsical"] button:hover:not(:disabled) {
    transform: translateY(-1px) !important;
  }

  /* — Inputs — */
  [data-theme="whimsical"] input,
  [data-theme="whimsical"] select,
  [data-theme="whimsical"] textarea {
    background: #fffdf9 !important;
    border-color: #d9d0e8 !important;
    border-radius: 1rem !important;
  }

  [data-theme="whimsical"] input:focus,
  [data-theme="whimsical"] select:focus,
  [data-theme="whimsical"] textarea:focus {
    border-color: #95d5b2 !important;
    box-shadow: 0 0 0 3px rgba(82, 183, 136, 0.2) !important;
  }

  /* — Bottom nav — */
  [data-theme="whimsical"] nav[role="navigation"] {
    background: rgba(253, 246, 238, 0.95) !important;
    border-top-color: #e5ddf0 !important;
    backdrop-filter: blur(12px) !important;
  }

  /* — Shadow warmth — */
  [data-theme="whimsical"] .shadow-sm {
    box-shadow: 0 1px 3px rgba(45, 106, 79, 0.08), 0 1px 2px rgba(45, 106, 79, 0.04) !important;
  }

  [data-theme="whimsical"] .shadow-md {
    box-shadow: 0 4px 12px rgba(45, 106, 79, 0.1), 0 2px 4px rgba(45, 106, 79, 0.06) !important;
  }

  [data-theme="whimsical"] .shadow-lg {
    box-shadow: 0 8px 24px rgba(45, 106, 79, 0.12), 0 4px 8px rgba(45, 106, 79, 0.06) !important;
  }

  /* — Gradient backgrounds for pages — */
  [data-theme="whimsical"] .min-h-screen {
    background: linear-gradient(180deg, #edf6e8 0%, #fdf6ee 40%, #fef9f3 100%) !important;
  }

  /* — Badges: softer pill shapes — */
  [data-theme="whimsical"] .rounded-full {
    border-radius: 999px !important;
  }

  [data-theme="whimsical"] .rounded-md {
    border-radius: 0.75rem !important;
  }

  /* — Animate-pulse: warmer color — */
  [data-theme="whimsical"] .animate-pulse {
    background-color: #f0ebf8 !important;
  }

  /* — Empty state placeholder text — */
  [data-theme="whimsical"] .text-center.text-gray-400,
  [data-theme="whimsical"] p.text-gray-400.text-center {
    font-style: italic !important;
  }

  /* — Coral highlight for key actions — */
  [data-theme="whimsical"] .bg-gradient-to-r.from-green-600.to-green-500 {
    background: linear-gradient(135deg, #e07a5f, #f2a07b) !important;
  }

  /* Keep the whimsical toggle itself unstyled by theme */
  [data-theme="whimsical"] #theme-toggle-btn {
    background: initial;
    border-radius: initial;
  }
`;

const NUNITO_LINK = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"baseline" | "whimsical">("baseline");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("fe-theme");
    if (saved === "whimsical") {
      setTheme("whimsical");
      document.documentElement.setAttribute("data-theme", "whimsical");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (theme === "whimsical") {
      document.documentElement.setAttribute("data-theme", "whimsical");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("fe-theme", theme);
  }, [theme, mounted]);

  if (!mounted) return null;

  const toggle = () => setTheme((t) => (t === "baseline" ? "whimsical" : "baseline"));
  const isWhimsical = theme === "whimsical";

  return (
    <>
      {/* Load Nunito font for whimsical mode */}
      {isWhimsical && (
        <link rel="stylesheet" href={NUNITO_LINK} />
      )}

      {/* Inject whimsical styles */}
      <style dangerouslySetInnerHTML={{ __html: WHIMSICAL_STYLES }} />

      {/* Toggle button */}
      <button
        id="theme-toggle-btn"
        onClick={toggle}
        aria-label={`Switch to ${isWhimsical ? "baseline" : "whimsical"} theme`}
        title={`Current: ${isWhimsical ? "Whimsical" : "Baseline"} — Click to switch`}
        className="fixed z-[9999] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg border transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          bottom: "max(80px, calc(env(safe-area-inset-bottom) + 72px))",
          right: "12px",
          background: isWhimsical
            ? "linear-gradient(135deg, #2d6a4f, #52b788)"
            : "#ffffff",
          borderColor: isWhimsical ? "#40916c" : "#e5e7eb",
          color: isWhimsical ? "#ffffff" : "#6b7280",
          fontSize: "13px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Palette icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c0.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
        <span style={{ fontWeight: 700, letterSpacing: "0.5px" }}>
          {isWhimsical ? "W" : "B"}
        </span>
      </button>
    </>
  );
}
