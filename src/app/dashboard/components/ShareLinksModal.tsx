"use client";

import { useState } from "react";
import type { Calendar } from "../DashboardClient";

interface Props {
  calendar: Calendar;
  userId: string;
  onClose: () => void;
}

export default function ShareLinksModal({ calendar, userId, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const icsUrl = `${baseUrl}/api/feed/${calendar.token}`;
  const webcalUrl = icsUrl.replace(/^https?:\/\//, "webcal://");
  const caldavUrl = `${baseUrl}/api/caldav/${userId}/${calendar.id}/`;

  async function copyToClipboard(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const links = [
    {
      key: "ics",
      label: "ICS Subscribe URL",
      description: "For Outlook, Google Calendar — subscribe to auto-sync",
      url: icsUrl,
      badge: "Outlook / Google",
    },
    {
      key: "webcal",
      label: "WebCal URL",
      description: "For Apple Calendar — click to subscribe directly",
      url: webcalUrl,
      badge: "Apple Calendar",
    },
    {
      key: "caldav",
      label: "CalDAV URL",
      description: "For Apple Calendar, Thunderbird, DAVx⁵ — full two-way sync",
      url: caldavUrl,
      badge: "CalDAV",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg text-gray-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold">Share Links — {calendar.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {links.map((link) => (
            <div key={link.key} className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">{link.label}</p>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {link.badge}
                </span>
              </div>
              <p className="text-xs text-gray-400">{link.description}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={link.url}
                  className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 font-mono text-gray-600"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => copyToClipboard(link.url, link.key)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 transition-colors"
                >
                  {copied === link.key ? "✓ Copied" : "Copy"}
                </button>
              </div>
              {link.key === "webcal" && (
                <a
                  href={link.url}
                  className="inline-block text-xs text-blue-600 hover:underline"
                >
                  Click to open in Apple Calendar →
                </a>
              )}
            </div>
          ))}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <strong>CalDAV credentials:</strong> Use your email and password to authenticate.
            <br />
            Server URL: <code className="font-mono">{`${baseUrl}/api/caldav/${userId}/`}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
