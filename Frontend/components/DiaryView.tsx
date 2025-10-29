"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import MacroChart from "./MacroChart";

export default function DiaryView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [grouped, setGrouped] = useState<any>({});

  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/logs/week")
      .then((res) => {
        const logs = res.data.logs;
        const groupedData = logs.reduce((acc: any, log: any) => {
          const day = log.timestamp.split("T")[0];

          let parsed;
          try {
            parsed =
              log.parsed_json && typeof log.parsed_json === "string"
                ? JSON.parse(log.parsed_json)
                : log.parsed_json;
          } catch (e) {
            console.warn("Skipping log due to parse error:", e);
            return acc;
          }

          if (!parsed || !parsed.items || !parsed.total) return acc;

          acc[day] = acc[day] || {
            entries: [],
            total: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          };

          parsed.items.forEach((item: any) => acc[day].entries.push(item));
          acc[day].total.calories += parsed.total.calories;
          acc[day].total.protein += parsed.total.protein;
          acc[day].total.carbs += parsed.total.carbs;
          acc[day].total.fat += parsed.total.fat;

          return acc;
        }, {});

        setLogs(logs);
        setGrouped(groupedData);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">
        📘 Weekly Diary – Food Breakdown
      </h2>

      {Object.entries(grouped).map(([day, { entries, total }]: any) => (
        <div key={day} className="bg-gray-100 rounded p-4 mb-4 shadow">
          <h3 className="font-semibold mb-2">{day}</h3>
          {entries.map((item: any, i: number) => (
            <div key={i} className="text-sm">
              <strong>{item.name}:</strong> {item.calories} cal, {item.protein}g
              P, {item.carbs}g C, {item.fat}g F
            </div>
          ))}
          <p className="mt-2 font-semibold">
            🧮 Total: {total.calories} cal – {total.protein}g P, {total.carbs}g
            C, {total.fat}g F
          </p>
        </div>
      ))}

      <MacroChart data={grouped} />
    </div>
  );
}
