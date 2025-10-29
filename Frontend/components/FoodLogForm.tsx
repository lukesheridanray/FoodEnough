"use client";
import { useState } from "react";
import axios from "axios";

export default function FoodLogForm() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      await axios.post("http://127.0.0.1:8000/save_log", { input_text: text });
      alert("Log saved!");
      setText("");
    } catch (err) {
      alert("Error saving log.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. 2 eggs, toast, black coffee"
        className="w-full p-3 border rounded"
      />
      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-4 py-2 mt-2 rounded"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Log"}
      </button>
    </div>
  );
}
