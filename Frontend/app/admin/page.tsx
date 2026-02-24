"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Copy, Check, UserX, UserCheck } from "lucide-react";
import { useAdmin, AdminUser, InviteCodeEntry } from "../hooks/useAdmin";

function UserCard({
  user,
  togglingUserId,
  onToggle,
}: {
  user: AdminUser;
  togglingUserId: number | null;
  onToggle: (id: number, active: boolean) => void;
}) {
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {user.is_admin && (
            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              Admin
            </span>
          )}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              user.is_active
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {user.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center bg-gray-50 rounded-lg py-1.5">
          <p className="text-xs font-bold text-gray-700">{user.log_count}</p>
          <p className="text-[10px] text-gray-400">Logs</p>
        </div>
        <div className="text-center bg-gray-50 rounded-lg py-1.5">
          <p className="text-xs font-bold text-gray-700">{user.workout_count}</p>
          <p className="text-[10px] text-gray-400">Workouts</p>
        </div>
        <div className="text-center bg-gray-50 rounded-lg py-1.5">
          <p className="text-xs font-bold text-gray-700">{user.weight_count}</p>
          <p className="text-[10px] text-gray-400">Weights</p>
        </div>
      </div>

      {user.last_active && (
        <p className="text-[10px] text-gray-400 mt-2">
          Last active: {new Date(user.last_active).toLocaleDateString()}
        </p>
      )}

      {!user.is_admin && (
        <div className="mt-3">
          {confirmDeactivate && user.is_active ? (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeactivate(false)}
                className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => { onToggle(user.id, false); setConfirmDeactivate(false); }}
                disabled={togglingUserId === user.id}
                className="flex-1 text-xs py-1.5 rounded-lg bg-red-500 text-white disabled:opacity-60"
              >
                {togglingUserId === user.id ? "…" : "Confirm Deactivate"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (user.is_active) setConfirmDeactivate(true);
                else onToggle(user.id, true);
              }}
              disabled={togglingUserId === user.id}
              className={`w-full text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-60 ${
                user.is_active
                  ? "border border-red-200 text-red-600 hover:bg-red-50"
                  : "border border-green-200 text-green-600 hover:bg-green-50"
              }`}
            >
              {user.is_active ? (
                <><UserX className="w-3 h-3" /> Deactivate</>
              ) : (
                <><UserCheck className="w-3 h-3" /> Activate</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InviteCodeCard({ invite }: { invite: InviteCodeEntry }) {
  const [copied, setCopied] = useState(false);
  const isAvailable = !invite.used_by_email && invite.is_active;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold tracking-wider text-gray-900">{invite.code}</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isAvailable
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {isAvailable ? "Available" : "Used"}
          </span>
        </div>
        {invite.used_by_email && (
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            Used by {invite.used_by_email}{" "}
            {invite.used_at && `on ${new Date(invite.used_at).toLocaleDateString()}`}
          </p>
        )}
      </div>
      {isAvailable && (
        <button
          onClick={handleCopy}
          className="ml-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const admin = useAdmin();
  const [codeCount, setCodeCount] = useState(1);

  if (admin.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <div style={{ height: "max(24px, env(safe-area-inset-top))" }} />
        <header className="px-5 pt-4 pb-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </header>
        <section className="px-5 mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-10">
      <div style={{ height: "max(24px, env(safe-area-inset-top))" }} />

      <header className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => router.push("/profile")}
          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
        </div>
      </header>

      {admin.error && (
        <div className="mx-5 mt-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
          {admin.error}
        </div>
      )}

      {/* Invite Codes Section */}
      <section className="px-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Invite Codes ({admin.inviteCodes.filter((c) => !c.used_by_email && c.is_active).length} available)
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
          <div className="flex items-center gap-2">
            <select
              value={codeCount}
              onChange={(e) => setCodeCount(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            >
              {[1, 5, 10, 25, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button
              onClick={() => admin.generateCodes(codeCount)}
              disabled={admin.generating}
              className="flex-1 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60"
            >
              {admin.generating ? "Generating…" : "Generate Codes"}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {admin.inviteCodes.map((inv) => (
            <InviteCodeCard key={inv.id} invite={inv} />
          ))}
          {admin.inviteCodes.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No invite codes yet. Generate some above.</p>
          )}
        </div>
      </section>

      {/* Users Section */}
      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Users ({admin.users.length})
        </h2>
        <div className="space-y-3">
          {admin.users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              togglingUserId={admin.togglingUserId}
              onToggle={admin.toggleUserStatus}
            />
          ))}
          {admin.users.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No users found.</p>
          )}
        </div>
      </section>
    </div>
  );
}
