"use client";

import { useState, useEffect, useCallback } from "react";
import type { Calendar } from "../DashboardClient";

interface Share {
  id: string;
  permission: string;
  user: { id: string; name: string; email: string };
}

interface Props {
  calendar: Calendar;
  onClose: () => void;
}

export default function ShareModal({ calendar, onClose }: Props) {
  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("read");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchShares = useCallback(async () => {
    const res = await fetch(`/api/calendars/${calendar.id}/share`);
    if (res.ok) {
      const data = await res.json();
      setShares(data.shares ?? []);
    }
  }, [calendar.id]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/calendars/${calendar.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permission }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to share");
        return;
      }
      setEmail("");
      fetchShares();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(userId: string) {
    await fetch(`/api/calendars/${calendar.id}/share`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    fetchShares();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md text-gray-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold">Share &quot;{calendar.name}&quot;</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Add share form */}
          <form onSubmit={handleShare} className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Share with a user</p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Share
              </button>
            </div>
          </form>

          {/* Current shares */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Shared with</p>
            {shares.length === 0 ? (
              <p className="text-sm text-gray-400">Not shared with anyone yet</p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{share.user.name}</p>
                      <p className="text-xs text-gray-400">{share.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {share.permission}
                      </span>
                      <button
                        onClick={() => handleRemove(share.user.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
