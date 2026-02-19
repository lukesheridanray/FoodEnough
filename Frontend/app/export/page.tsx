"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, authHeaders } from "../../lib/auth";

export default function ExportPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, []);

  const downloadCSV = async () => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/logs/export`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        removeToken();
        router.push("/login");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "food_logs.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Export Your Food Logs</h1>
      <button
        onClick={downloadCSV}
        className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
      >
        Download CSV
      </button>
    </div>
  );
}
