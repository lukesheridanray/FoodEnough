"use client";

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

interface MacroChartProps {
  data: Record<
    string,
    {
      total: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }
  >;
}

export default function MacroChart({ data }: MacroChartProps) {
  // Transform grouped object into array for the chart
  const chartData = Object.entries(data).map(([date, { total }]) => ({
    date,
    calories: total.calories,
    protein: total.protein,
    carbs: total.carbs,
    fat: total.fat,
  }));

  if (chartData.length === 0) return null;

  return (
    <div className="mt-10">
      <h3 className="text-xl font-bold mb-2">📊 Weekly Macro Totals</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="calories" stackId="a" fill="#8884d8">
            <LabelList dataKey="calories" position="top" />
          </Bar>
          <Bar dataKey="protein" stackId="a" fill="#82ca9d" />
          <Bar dataKey="carbs" stackId="a" fill="#ffc658" />
          <Bar dataKey="fat" stackId="a" fill="#ff7f7f" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
