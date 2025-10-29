"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm px-4 py-3 mb-6 border-b">
      <div className="flex justify-between items-center max-w-3xl mx-auto">
        <Link href="/" className="text-xl font-bold text-purple-700">
          🍽️ FoodEnough
        </Link>
        <div className="space-x-4">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 hover:text-purple-700"
          >
            Log
          </Link>
          <Link
            href="/diary"
            className="text-sm font-medium text-gray-700 hover:text-purple-700"
          >
            Diary
          </Link>
        </div>
      </div>
    </nav>
  );
}
