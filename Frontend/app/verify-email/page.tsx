"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { API_URL } from "../../lib/config";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (data.message?.includes("already")) {
            setStatus("already");
          } else {
            setStatus("success");
          }
          setMessage(data.message || "Email verified!");
        } else {
          setStatus("error");
          setMessage(data.detail || "Verification failed. The link may be invalid or expired.");
        }
      } catch {
        setStatus("error");
        setMessage("Connection failed. Please try again.");
      }
    };
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex items-center justify-center px-5">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto mb-3" />
            <h1 className="text-xl font-bold text-green-900 mb-2">Verifying your email...</h1>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl mb-3">{"\u2705"}</div>
            <h1 className="text-xl font-bold text-green-900 mb-2">Email Verified!</h1>
            <p className="text-sm text-gray-500 mb-6">Your account is now fully activated.</p>
            <Link
              href="/"
              className="block w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-center"
            >
              Go to App
            </Link>
          </>
        )}
        {status === "already" && (
          <>
            <div className="text-4xl mb-3">{"\u2705"}</div>
            <h1 className="text-xl font-bold text-green-900 mb-2">Already Verified</h1>
            <p className="text-sm text-gray-500 mb-6">Your email was already verified.</p>
            <Link
              href="/"
              className="block w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-center"
            >
              Go to App
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-3">{"\u26A0\uFE0F"}</div>
            <h1 className="text-xl font-bold text-red-700 mb-2">Verification Failed</h1>
            <p className="text-sm text-red-500 mb-6">{message}</p>
            <Link
              href="/login"
              className="block w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-center"
            >
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-50 flex items-center justify-center px-5">
          <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
            <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto mb-3" />
            <h1 className="text-xl font-bold text-green-900 mb-2">Verifying your email...</h1>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
