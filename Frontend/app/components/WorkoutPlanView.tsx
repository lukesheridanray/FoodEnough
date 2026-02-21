"use client";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { ActivePlan, FitnessProfile } from "../hooks/useWorkouts";

const DAY_NAMES: Record<number, string[]> = {
  3: ["Mon", "Wed", "Fri"],
  4: ["Mon", "Tue", "Thu", "Fri"],
  5: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  6: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

function getDayLabel(dayNumber: number, daysPerWeek: number): string {
  const names = DAY_NAMES[daysPerWeek];
  if (names && dayNumber >= 1 && dayNumber <= names.length) {
    return names[dayNumber - 1];
  }
  return `Day ${dayNumber}`;
}

interface WorkoutPlanViewProps {
  activePlan: ActivePlan;
  fitnessProfile: FitnessProfile | null;
  expandedWeek: number | null;
  setExpandedWeek: (week: number | null) => void;
  expandedSession: number | null;
  setExpandedSession: (session: number | null) => void;
  completingSession: number | null;
  abandoningPlan: boolean;
  abandonError: string;
  showAbandonConfirm: boolean;
  setShowAbandonConfirm: (show: boolean) => void;
  onCompleteSession: (sessionId: number) => void;
  onAbandonPlan: () => void;
}

export default function WorkoutPlanView({
  activePlan,
  fitnessProfile,
  expandedWeek,
  setExpandedWeek,
  expandedSession,
  setExpandedSession,
  completingSession,
  abandoningPlan,
  abandonError,
  showAbandonConfirm,
  setShowAbandonConfirm,
  onCompleteSession,
  onAbandonPlan,
}: WorkoutPlanViewProps) {
  const progressPct =
    activePlan.total_sessions > 0
      ? Math.round((activePlan.completed_sessions / activePlan.total_sessions) * 100)
      : 0;

  return (
    <>
      {/* Plan header card */}
      <section className="px-5 mt-2">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="font-bold text-gray-800">{activePlan.name}</h2>
              {activePlan.notes && (
                <p className="text-xs text-gray-500 mt-0.5">{activePlan.notes}</p>
              )}
            </div>
            {!showAbandonConfirm && (
              <button
                onClick={() => setShowAbandonConfirm(true)}
                className="text-xs text-red-400 hover:text-red-600 ml-4 flex-shrink-0"
              >
                Abandon
              </button>
            )}
          </div>
          {showAbandonConfirm && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-600 flex-1">Abandon this plan?</span>
              <button
                onClick={() => setShowAbandonConfirm(false)}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onAbandonPlan}
                disabled={abandoningPlan}
                className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-60 flex items-center gap-1"
              >
                {abandoningPlan ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Abandoning\u2026</>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          )}
          {abandonError && <p className="text-red-500 text-xs mt-1">{abandonError}</p>}
          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {activePlan.completed_sessions} / {activePlan.total_sessions} sessions complete {"\u00b7"} {progressPct}%
          </p>
        </div>
      </section>

      {/* Week accordions */}
      <section className="px-5 mt-4 space-y-3">
        {activePlan.weeks.map((week) => {
          const weekDone = week.sessions.length > 0 && week.sessions.every((s) => s.is_completed);
          const weekStarted = week.sessions.some((s) => s.is_completed);
          const isOpen = expandedWeek === week.week_number;

          return (
            <div key={week.week_number} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Week header button */}
              <button
                onClick={() => {
                  setExpandedWeek(isOpen ? null : week.week_number);
                  setExpandedSession(null);
                }}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  {weekDone ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : weekStarted ? (
                    <div className="w-5 h-5 rounded-full border-2 border-green-400 bg-green-50 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={`font-semibold ${weekDone ? "text-green-700" : "text-gray-800"}`}>
                    Week {week.week_number}
                  </span>
                  <span className="text-xs text-gray-400">
                    {week.sessions.filter((s) => s.is_completed).length}/{week.sessions.length} done
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Session list */}
              {isOpen && (
                <div className="border-t border-gray-50">
                  {week.sessions.map((session) => {
                    const sessExpanded = expandedSession === session.id;
                    return (
                      <div key={session.id} className="border-b border-gray-50 last:border-0">
                        <div className="flex items-center px-4 py-3 gap-2">
                          {session.is_completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                          )}
                          <button
                            onClick={() => setExpandedSession(sessExpanded ? null : session.id)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                {getDayLabel(session.day_number, fitnessProfile?.days_per_week ?? 0)}
                              </span>
                              <span
                                className={`text-sm font-medium ${
                                  session.is_completed ? "text-gray-400 line-through" : "text-gray-800"
                                }`}
                              >
                                {session.name}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {session.exercises.length} exercises
                            </div>
                          </button>
                          {!session.is_completed && (
                            <button
                              onClick={() => onCompleteSession(session.id)}
                              disabled={completingSession === session.id}
                              className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg font-medium disabled:opacity-60 flex-shrink-0"
                            >
                              {completingSession === session.id ? "\u2026" : "Done \u2713"}
                            </button>
                          )}
                        </div>

                        {/* Exercise preview */}
                        {sessExpanded && (
                          <div className="px-4 pb-3 space-y-2">
                            {session.exercises.map((ex, i) => (
                              <div key={i} className="bg-gray-50 rounded-xl p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm font-semibold text-gray-800">{ex.name}</span>
                                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                                    <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                      {ex.sets}{"\u00d7"}{ex.reps}
                                    </span>
                                    {ex.rest_seconds ? (
                                      <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                        {ex.rest_seconds}s rest
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                {ex.notes && (
                                  <p className="text-xs text-gray-500 mt-1">{ex.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
