"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../../lib/auth";
import { apiFetch, UnauthorizedError } from "../../lib/api";

export interface AdminUser {
  id: number;
  email: string;
  created_at: string | null;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  log_count: number;
  workout_count: number;
  weight_count: number;
  last_active: string | null;
}

export interface InviteCodeEntry {
  id: number;
  code: string;
  is_active: boolean;
  used_by_email: string | null;
  used_at: string | null;
  created_at: string | null;
}

export function useAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);
  const router = useRouter();

  const handleUnauthorized = () => {
    router.push("/login");
  };

  const handleForbidden = () => {
    router.push("/");
  };

  const loadUsers = useCallback(async () => {
    try {
      const res = await apiFetch("/admin/users");
      if (res.status === 403) { handleForbidden(); return; }
      if (!res.ok) { setError("Failed to load users."); return; }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setError("Connection failed.");
    }
  }, []);

  const loadInviteCodes = useCallback(async () => {
    try {
      const res = await apiFetch("/admin/invite-codes");
      if (res.status === 403) { handleForbidden(); return; }
      if (!res.ok) { setError("Failed to load invite codes."); return; }
      const data = await res.json();
      setInviteCodes(data.invite_codes || []);
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setError("Connection failed.");
    }
  }, []);

  const generateCodes = async (count: number) => {
    setGenerating(true);
    try {
      const res = await apiFetch("/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      if (res.status === 403) { handleForbidden(); return; }
      if (!res.ok) { setError("Failed to generate codes."); return; }
      await loadInviteCodes();
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setError("Connection failed.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleUserStatus = async (userId: number, newActive: boolean) => {
    setTogglingUserId(userId);
    try {
      const res = await apiFetch(`/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (res.status === 403) { handleForbidden(); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Failed to update user.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: newActive } : u))
      );
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleUnauthorized(); return; }
      setError("Connection failed.");
    } finally {
      setTogglingUserId(null);
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    Promise.all([loadUsers(), loadInviteCodes()]).finally(() => setLoading(false));
  }, []);

  return {
    users,
    inviteCodes,
    loading,
    error,
    generating,
    togglingUserId,
    generateCodes,
    toggleUserStatus,
    loadInviteCodes,
  };
}
