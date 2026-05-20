"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import CalendarList from "./components/CalendarList";
import CalendarGrid from "./components/CalendarGrid";
import MiniCalendar from "./components/MiniCalendar";
import EventModal from "./components/EventModal";
import CalendarModal from "./components/CalendarModal";
import ShareModal from "./components/ShareModal";
import ShareLinksModal from "./components/ShareLinksModal";

export interface Calendar {
  id: string;
  name: string;
  description: string | null;
  color: string;
  token: string;
  userId: string;
  _count?: { events: number };
  permission?: string;
  user?: { name: string; email: string };
}

export interface CalendarEvent {
  id: string;
  uid: string;
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  status: string;
  reminder: number | null;
  category: string | null;
  categoryColor: string | null;
  isPrivate: boolean;
  recurrence: string | null;
}

interface Props {
  user: SessionUser;
}

export default function DashboardClient({ user }: Props) {
  const router = useRouter();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [sharedCalendars, setSharedCalendars] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [gridDate, setGridDate] = useState(new Date());

  // Modals
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEventStart, setNewEventStart] = useState<Date | undefined>(undefined);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareLinksModal, setShowShareLinksModal] = useState(false);

  // Fetch all events from all calendars at once
  const fetchAllEvents = useCallback(async (calIds: string[]) => {
    if (calIds.length === 0) { setEvents([]); return; }
    const results = await Promise.all(
      calIds.map((id) =>
        fetch(`/api/calendars/${id}/events`)
          .then((r) => r.ok ? r.json() : { events: [] })
          .then((d: { events: CalendarEvent[] }) => d.events ?? [])
      )
    );
    setEvents(results.flat());
  }, []);

  const fetchCalendars = useCallback(async () => {
    const res = await fetch("/api/calendars");
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    const owned: Calendar[] = data.owned ?? [];
    const shared: Calendar[] = data.shared ?? [];
    setCalendars(owned);
    setSharedCalendars(shared);
    setLoading(false);
    // Fetch events for all calendars
    const allIds = [...owned, ...shared].map((c) => c.id);
    fetchAllEvents(allIds);
  }, [router, fetchAllEvents]);

  useEffect(() => { fetchCalendars(); }, [fetchCalendars]);

  // SSE real-time push
  useEffect(() => {
    const es = new EventSource("/api/events-stream");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "calendar_updated" || data.type === "event_updated") {
          fetchCalendars();
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [fetchCalendars]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function handleDeleteCalendar(cal: Calendar) {
    if (!confirm(`Delete calendar "${cal.name}"? This will delete all events.`)) return;
    await fetch(`/api/calendars/${cal.id}`, { method: "DELETE" });
    if (selectedCalendar?.id === cal.id) setSelectedCalendar(null);
    fetchCalendars();
  }

  async function handleDeleteEvent(event: CalendarEvent) {
    if (!confirm(`Delete event "${event.title}"?`)) return;
    await fetch(`/api/calendars/${event.calendarId}/events/${event.id}`, { method: "DELETE" });
    fetchCalendars(); // refresh all events
  }

  function handleNewEvent(startAt?: Date) {
    setEditingEvent(null);
    setNewEventStart(startAt);
    setShowEventModal(true);
  }

  const allCalendars = [...calendars, ...sharedCalendars];

  // canWrite: true if a calendar is selected and user has write access
  const canWrite =
    !!selectedCalendar &&
    (selectedCalendar.userId === user.id || selectedCalendar.permission === "write");

  // For new event modal — use selectedCalendar, or first owned calendar as fallback
  const activeCalendarForNewEvent = selectedCalendar ?? calendars[0] ?? null;
  const activeCanWrite =
    !!activeCalendarForNewEvent &&
    (activeCalendarForNewEvent.userId === user.id ||
      activeCalendarForNewEvent.permission === "write");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-white text-gray-900"
      style={{ colorScheme: "light" }}
    >
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4 flex-shrink-0">
        <div className="w-52 flex-shrink-0">
          <img src="/assets/img/logo.png" alt="AnSar Calendar" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex-1" />

        {/* Profile dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-gray-700 font-medium">{user.name}</span>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>

                {/* Profile link */}
                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile & Settings
                </Link>

                <div className="border-t border-gray-100 my-1" />

                {/* Logout */}
                <button
                  onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-52 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
          {/* New event button */}
          <div className="p-3">
            <button
              onClick={() => handleNewEvent()}
              disabled={!activeCanWrite}
              className="w-full py-2 px-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              + New event
            </button>
          </div>

          {/* Mini calendar */}
          <div className="border-b border-gray-100 pb-2">
            <MiniCalendar
              selectedDate={gridDate}
              onSelectDate={(d) => setGridDate(d)}
            />
          </div>

          {/* Calendar list */}
          <div className="flex-1">
            <div className="px-3 pt-3 pb-1">
              <button
                onClick={() => {
                  setEditingCalendar(null);
                  setShowCalendarModal(true);
                }}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                + Add calendar
              </button>
            </div>
            <CalendarList
              calendars={calendars}
              sharedCalendars={sharedCalendars}
              selectedId={selectedCalendar?.id ?? null}
              userId={user.id}
              onSelect={setSelectedCalendar}
              onEdit={(cal) => {
                setEditingCalendar(cal);
                setShowCalendarModal(true);
              }}
              onShare={(cal) => {
                setSelectedCalendar(cal);
                setShowShareModal(true);
              }}
              onShareLinks={(cal) => {
                setSelectedCalendar(cal);
                setShowShareLinksModal(true);
              }}
              onDelete={handleDeleteCalendar}
            />
          </div>
        </aside>

        {/* Main calendar grid — always visible, shows all events */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <CalendarGrid
            events={events}
            calendars={allCalendars}
            canWrite={activeCanWrite}
            onEditEvent={(event) => {
              setEditingEvent(event);
              setNewEventStart(undefined);
              // Auto-select the calendar this event belongs to
              const cal = allCalendars.find((c) => c.id === event.calendarId);
              if (cal) setSelectedCalendar(cal);
              setShowEventModal(true);
            }}
            onDeleteEvent={handleDeleteEvent}
            onNewEvent={handleNewEvent}
          />
        </main>
      </div>

      {/* Modals */}
      {showCalendarModal && (
        <CalendarModal
          calendar={editingCalendar}
          onClose={() => setShowCalendarModal(false)}
          onSaved={() => {
            setShowCalendarModal(false);
            fetchCalendars();
          }}
        />
      )}

      {showEventModal && activeCalendarForNewEvent && (
        <EventModal
          event={editingEvent}
          calendarId={
            editingEvent
              ? editingEvent.calendarId
              : activeCalendarForNewEvent.id
          }
          calendars={allCalendars.filter(c =>
            c.userId === user.id || c.permission === "write"
          )}
          defaultStartAt={newEventStart}
          onClose={() => setShowEventModal(false)}
          onSaved={() => {
            setShowEventModal(false);
            fetchCalendars();
          }}
          onDeleted={() => {
            setShowEventModal(false);
            fetchCalendars();
          }}
        />
      )}

      {showShareModal && selectedCalendar && (
        <ShareModal
          calendar={selectedCalendar}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showShareLinksModal && selectedCalendar && (
        <ShareLinksModal
          calendar={selectedCalendar}
          userId={user.id}
          onClose={() => setShowShareLinksModal(false)}
        />
      )}
    </div>
  );
}
