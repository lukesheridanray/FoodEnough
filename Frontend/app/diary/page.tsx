"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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

interface Log {
  timestamp: string;
  parsed_json: {
    items: FoodItem[];
    total: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
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

  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/logs/week")
      .then((res) => {
        const grouped: Record<string, FoodItem[]> = {};
        const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

        for (const log of res.data.logs) {
          const date = new Date(log.timestamp).toLocaleDateString();
          const parsed =
            typeof log.parsed_json === "string"
              ? JSON.parse(log.parsed_json)
              : log.parsed_json;

          if (parsed && parsed.items) {
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(...parsed.items);

            totals.calories += parsed.total.calories;
            totals.protein += parsed.total.protein;
            totals.carbs += parsed.total.carbs;
            totals.fat += parsed.total.fat;
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
      })
      .catch((err) => {
        console.error("Failed to fetch logs:", err);
      });
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">
        📘 Weekly Diary – Food Breakdown
      </h2>

      {dailyLogs.length === 0 && <p>No logs found.</p>}

      {dailyLogs.map((group, i) => (
        <div key={i} className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
          <p className="text-sm text-gray-600 mb-2 font-medium">{group.date}</p>
          <ul className="mb-2 space-y-1 text-sm">
            {group.items.map((item, idx) => (
              <li key={idx}>
                <span className="font-semibold">{item.name}:</span>{" "}
                {item.calories} cal, {item.protein}g P, {item.carbs}g C,{" "}
                {item.fat}g F
              </li>
            ))}
          </ul>
          <div className="text-sm text-gray-800 font-semibold">
            🧮 Total: {group.total.calories} cal • {group.total.protein}g P •{" "}
            {group.total.carbs}g C • {group.total.fat}g F
          </div>
        </div>
      ))}

      <h3 className="text-xl font-bold mt-10 mb-2">📊 Weekly Macro Totals</h3>
      <p className="mb-6 text-gray-700">
        {weekTotal.calories} cal • {weekTotal.protein}g P • {weekTotal.carbs}g C
        • {weekTotal.fat}g F
      </p>

      <div className="bg-white border p-4 rounded shadow">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={dailyLogs}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total.calories" stackId="a" fill="#8884d8">
              <LabelList dataKey="total.calories" position="top" />
            </Bar>
            <Bar dataKey="total.protein" stackId="a" fill="#82ca9d" />
            <Bar dataKey="total.carbs" stackId="a" fill="#ffc658" />
            <Bar dataKey="total.fat" stackId="a" fill="#ff7f7f" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
