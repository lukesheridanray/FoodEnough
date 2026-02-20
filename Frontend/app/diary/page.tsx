"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken } from "../../lib/auth";
import { API_URL } from "../../lib/config";
import BottomNav from "../components/BottomNav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DailyGroup {
  date: string;
  items: FoodItem[];
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function DiaryPage() {
  const [dailyLogs, setDailyLogs] = useState<DailyGroup[]>([]);
  const [weekTotal, setWeekTotal] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = last week, etc.
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/logs/week?offset_days=${weekOffset * 7}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 401) {
            removeToken();
            router.push("/login");
            return;
          }
          setError("Failed to load diary. Please try again.");
          return;
        }

        const data = await res.json();
        const grouped: Record<string, FoodItem[]> = {};
        const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

        for (const log of data.logs) {
          const date = new Date(log.timestamp).toLocaleDateString();
          if (!grouped[date]) grouped[date] = [];

          const parsed =
            typeof log.parsed_json === "string"
              ? (() => {
                  try {
                    return JSON.parse(log.parsed_json);
                  } catch {
                    return null;
                  }
                })()
              : log.parsed_json;

          if (parsed?.items?.length) {
            grouped[date].push(...parsed.items);
            totals.calories += parsed.total?.calories ?? 0;
            totals.protein += parsed.total?.protein ?? 0;
            totals.carbs += parsed.total?.carbs ?? 0;
            totals.fat += parsed.total?.fat ?? 0;
          } else {
            // Fallback to top-level log fields
            grouped[date].push({
              name: log.input_text,
              calories: log.calories ?? 0,
              protein: log.protein ?? 0,
              carbs: log.carbs ?? 0,
              fat: log.fat ?? 0,
            });
            totals.calories += log.calories ?? 0;
            totals.protein += log.protein ?? 0;
            totals.carbs += log.carbs ?? 0;
            totals.fat += log.fat ?? 0;
          }
        }

        const output: DailyGroup[] = Object.entries(grouped).map(
          ([date, items]) => {
            const total = items.reduce(
              (sum, item) => {
                sum.calories += item.calories;
                sum.protein += item.protein;
                sum.carbs += item.carbs;
                sum.fat += item.fat;
                return sum;
              },
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );
            return { date, items, total };
          }
        );

        setDailyLogs(output);
        setWeekTotal(totals);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
        setError("Failed to load diary. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [weekOffset]);

  const getWeekLabel = () => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - weekOffset * 7);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(startDate)} – ${fmt(endDate)}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex items-center justify-center">
      <p className="text-red-500">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50">
      <div style={{ height: 'max(24px, env(safe-area-inset-top))' }} />
      <div className="px-5 max-w-2xl mx-auto pb-28">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => { setWeekOffset(w => w + 1); setLoading(true); }}
            className="p-2 rounded-xl bg-white shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
            title="Previous week"
          >
            ←
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-green-900">{weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Last Week' : `${weekOffset} Weeks Ago`}</h2>
            <p className="text-sm text-gray-500">{getWeekLabel()}</p>
          </div>
          <button
            onClick={() => { setWeekOffset(w => Math.max(0, w - 1)); setLoading(true); }}
            disabled={weekOffset === 0}
            className="p-2 rounded-xl bg-white shadow-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next week"
          >
            →
          </button>
        </div>

        {dailyLogs.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">📅</div>
            <p className="text-gray-700 font-semibold">No entries this week</p>
            <p className="text-gray-400 text-sm mt-1">Log meals on the home screen to see them here</p>
          </div>
        )}

        {dailyLogs.map((group) => (
          <div key={group.date} className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-2 font-medium">{group.date}</p>
            <ul className="mb-2 space-y-1 text-sm">
              {group.items.map((item, idx) => (
                <li key={idx + "-" + item.name} className="flex items-baseline justify-between">
                  <span className="font-medium text-gray-700">{item.name}</span>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {item.calories} kcal · <span className="text-blue-500">{item.protein}g P</span> · <span className="text-amber-500">{item.carbs}g C</span> · <span className="text-orange-500">{item.fat}g F</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="text-sm font-semibold text-gray-800 border-t border-gray-50 pt-2 mt-2 flex items-center gap-3 flex-wrap">
              <span>{group.total.calories} kcal</span>
              <span className="text-blue-600">{group.total.protein}g P</span>
              <span className="text-amber-600">{group.total.carbs}g C</span>
              <span className="text-orange-600">{group.total.fat}g F</span>
            </div>
          </div>
        ))}

        {dailyLogs.length > 0 && (<>
        <h3 className="text-lg font-bold text-green-900 mt-8 mb-3">Weekly Calories</h3>
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={dailyLogs.map((g) => ({ date: g.date, calories: g.total.calories }))}
              margin={{ top: 24, right: 16, left: 0, bottom: 5 }}
            >
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [`${value} kcal`, "Calories"]} />
              <Bar dataKey="calories" fill="#16a34a" radius={[4, 4, 0, 0] as [number, number, number, number]}>
                <LabelList dataKey="calories" position="top" style={{ fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <h3 className="text-lg font-bold text-green-900 mb-3">Macro Summary</h3>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Macro</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-gray-800">Protein</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-blue-600">{weekTotal.protein}g</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                    <span className="text-gray-800">Carbs</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-amber-600">{weekTotal.carbs}g</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                    <span className="text-gray-800">Fat</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-orange-600">{weekTotal.fat}g</td>
              </tr>
            </tbody>
          </table>
        </div>
        </>)}

        <BottomNav />
      </div>
    </div>
  );
}
