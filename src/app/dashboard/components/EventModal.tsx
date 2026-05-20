"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CalendarEvent, Calendar } from "../DashboardClient";
import RichEditor from "./RichEditor";
import EventDayPreview from "./EventDayPreview";

interface RecurrenceConfig {
  type: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
  count?: number;
  endType: "never" | "date" | "count";
}

interface LocationSuggestion {
  display_name: string;
  place_id: string;
}

interface Props {
  event: CalendarEvent | null;
  calendarId: string;
  calendars: Calendar[];          // all calendars user can write to
  defaultStartAt?: Date;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

const STATUS_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "working_elsewhere", label: "Working elsewhere" },
  { value: "tentative", label: "Tentative" },
  { value: "busy", label: "Busy" },
  { value: "out_of_office", label: "Out of office" },
];

const REMINDER_OPTIONS = [
  { value: -1, label: "Don't remind me" },
  { value: 0, label: "At time of event" },
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 720, label: "12 hours before" },
  { value: 1440, label: "1 day before" },
  { value: 10080, label: "1 week before" },
];

const CATEGORIES = [
  { label: "Blue category", color: "#3B82F6" },
  { label: "Green category", color: "#10B981" },
  { label: "Orange category", color: "#F97316" },
  { label: "Purple category", color: "#8B5CF6" },
  { label: "Red category", color: "#EF4444" },
  { label: "Yellow category", color: "#EAB308" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) { return String(n).padStart(2, "0"); }

function toDatetimeLocal(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DropdownBtn({
  label, icon, open, onClick, children,
}: {
  label?: string; icon: React.ReactNode; open: boolean;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2.5 py-[5px] rounded text-[13px] font-medium transition-colors ${open ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"}`}
      >
        {icon}
        {label && <span>{label}</span>}
        <svg className="w-3 h-3 text-gray-500 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] min-w-[200px] py-1">
          {children}
        </div>
      )}
    </div>
  );
}

function DropItem({ label, checked, color, onClick }: { label: string; checked: boolean; color?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 hover:bg-gray-50 ${checked ? "text-blue-600 font-semibold" : "text-gray-700"}`}>
      {color && <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />}
      {!color && <span className={`w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center ${checked ? "text-blue-600" : "text-transparent"}`}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </span>}
      {label}
    </button>
  );
}

export default function EventModal({ event, calendarId, calendars, defaultStartAt, onClose, onSaved, onDeleted }: Props) {
  const isEdit = !!event;
  const [tab, setTab] = useState<"event" | "series">("event");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openDrop, setOpenDrop] = useState<string | null>(null);

  // Selected calendar (can be changed via dropdown)
  const [selectedCalendarId, setSelectedCalendarId] = useState(calendarId);
  const [showCalendarDrop, setShowCalendarDrop] = useState(false);
  const selectedCalendar = calendars.find(c => c.id === selectedCalendarId) ?? calendars[0];

  // Location autocomplete
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Centre on mount
  useEffect(() => {
    const w = Math.min(1200, window.innerWidth * 0.95);
    const h = window.innerHeight * 0.95;
    setPos({
      left: Math.round((window.innerWidth - w) / 2),
      top: Math.round((window.innerHeight - h) / 2),
    });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button,input,select,textarea,a")) return;
    e.preventDefault();
    const rect = modalRef.current!.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({
        left: Math.max(0, Math.min(window.innerWidth - 200, dragRef.current.startLeft + dx)),
        top: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.startTop + dy)),
      });
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const [form, setForm] = useState({
    title: "", location: "", description: "",
    startAt: "", endAt: "", allDay: false,
    status: "busy", reminder: 15,
    category: "", categoryColor: "", isPrivate: false,
  });

  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({
    type: "weekly", interval: 1,
    daysOfWeek: [new Date().getDay()],
    endType: "never", endDate: "", count: 10,
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title, location: event.location ?? "",
        description: event.description ?? "",
        startAt: toDatetimeLocal(event.startAt),
        endAt: toDatetimeLocal(event.endAt),
        allDay: event.allDay, status: event.status ?? "busy",
        reminder: event.reminder ?? 15,
        category: event.category ?? "", categoryColor: event.categoryColor ?? "",
        isPrivate: event.isPrivate ?? false,
      });
      if (event.recurrence) {
        try { setRecurrence(JSON.parse(event.recurrence)); setTab("series"); } catch { /* */ }
      }
    } else {
      const start = defaultStartAt ?? new Date();
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      setForm({
        title: "", location: "", description: "",
        startAt: toDatetimeLocal(start.toISOString()),
        endAt: toDatetimeLocal(end.toISOString()),
        allDay: false, status: "busy", reminder: 15,
        category: "", categoryColor: "", isPrivate: false,
      });
    }
  }, [event, defaultStartAt]);

  async function handleSave() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setError(""); setLoading(true);
    try {
      const url = isEdit
        ? `/api/calendars/${calendarId}/events/${event!.id}`
        : `/api/calendars/${selectedCalendarId}/events`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          recurrence: tab === "series" ? recurrence : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      onSaved();
    } catch (err) { setError(`Network error: ${err instanceof Error ? err.message : String(err)}`); }
    finally { setLoading(false); }
  }

  async function searchLocation(query: string) {
    if (query.length < 3) { setLocationSuggestions([]); return; }
    try {
      const res = await fetch(`/api/location-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setLocationSuggestions(data);
      setShowLocationSuggestions(data.length > 0);
    } catch { /* ignore */ }
  }

  function handleLocationChange(value: string) {
    setForm({ ...form, location: value });
    if (locationSearchRef.current) clearTimeout(locationSearchRef.current);
    locationSearchRef.current = setTimeout(() => searchLocation(value), 400);
  }

  async function handleDelete() {
    if (!event) return;
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/events/${event.id}`, { method: "DELETE" });
      if (!res.ok) { setError("Failed to delete event"); return; }
      onDeleted ? onDeleted() : onSaved();
    } catch { setError("Network error."); }
    finally { setDeleting(false); }
  }

  function toggle(name: string) { setOpenDrop(openDrop === name ? null : name); }

  const selectedStatus = STATUS_OPTIONS.find(s => s.value === form.status);
  const selectedReminder = REMINDER_OPTIONS.find(r => r.value === form.reminder);
  const selectedCategory = CATEGORIES.find(c => c.label === form.category);

  function getRecurrenceLabel() {
    if (tab !== "series" || !form.startAt) return "";
    const days = recurrence.daysOfWeek?.map(d => DAY_LABELS[d]).join(", ") ?? "";
    const start = new Date(form.startAt).toLocaleDateString("en-MY");
    const endStr = recurrence.endType === "date" && recurrence.endDate
      ? new Date(recurrence.endDate).toLocaleDateString("en-MY")
      : recurrence.endType === "count" ? `${recurrence.count} occurrences` : "no end date";
    if (recurrence.type === "weekly") return `Occurs every ${recurrence.interval > 1 ? `${recurrence.interval} weeks` : "week"} on ${days} effective ${start} until ${endStr}`;
    if (recurrence.type === "daily") return `Occurs every ${recurrence.interval > 1 ? `${recurrence.interval} days` : "day"} effective ${start} until ${endStr}`;
    if (recurrence.type === "monthly") return `Occurs every ${recurrence.interval > 1 ? `${recurrence.interval} months` : "month"} effective ${start} until ${endStr}`;
    return `Occurs yearly effective ${start} until ${endStr}`;
  }

  const previewDate = form.startAt ? new Date(form.startAt) : new Date();
  const previewEvent = form.startAt ? {
    title: form.title || "Untitled",
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt || form.startAt).toISOString(),
    color: form.categoryColor || "#3B82F6",
    allDay: form.allDay,
  } : null;

  if (!pos) return null; // wait for centering

  const modalW = Math.min(1200, typeof window !== "undefined" ? window.innerWidth * 0.95 : 1200);
  const modalH = typeof window !== "undefined" ? window.innerHeight * 0.95 : 800;

  return (
    <div className="fixed inset-0 z-[200]" style={{ colorScheme: "light", backgroundColor: "rgba(0,0,0,0.45)" }}>
      {openDrop && <div className="fixed inset-0 z-[9990]" onClick={() => setOpenDrop(null)} />}

      {/* Draggable modal */}
      <div
        ref={modalRef}
        className="absolute bg-white rounded-lg shadow-2xl flex flex-col text-gray-900 overflow-hidden"
        style={{ left: pos.left, top: pos.top, width: modalW, height: modalH }}
      >
        {/* Title bar — Outlook style: thin gray bar */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-[#f3f2f1] border-b border-gray-200 flex-shrink-0 select-none cursor-move"
          onMouseDown={onMouseDown}
        >
          <span className="text-[12px] text-gray-700 pointer-events-none">
            {isEdit ? "Edit event" : "New event"} - {selectedCalendar?.name ?? "Calendar"}
          </span>
          <div className="flex items-center gap-0">
            <button onClick={onClose} className="w-9 h-7 flex items-center justify-center hover:bg-red-500 hover:text-white rounded text-gray-500 cursor-pointer transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toolbar — Outlook style */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0 flex-wrap">
          {/* Save */}
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-[5px] bg-[#0078d4] text-white text-[13px] font-semibold rounded hover:bg-[#106ebe] disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {loading ? "Saving..." : "Save"}
          </button>

          {/* Delete — only show when editing existing event */}
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-[5px] border border-red-300 text-red-600 text-[13px] font-medium rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
              title="Delete this event"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}

          <div className="w-px h-5 bg-gray-300 mx-0.5" />

          {/* Event / Series */}
          {(["event", "series"] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-2.5 py-[5px] rounded text-[13px] font-medium capitalize transition-colors ${tab === t ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"}`}>
              {t === "event"
                ? <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              }
              {t}
            </button>
          ))}

          <div className="w-px h-5 bg-gray-300 mx-0.5" />

          {/* Status */}
          <div className="relative z-[9991]">
            <DropdownBtn label={selectedStatus?.label ?? "Busy"} open={openDrop === "status"} onClick={() => toggle("status")}
              icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" opacity="0.6"/></svg>}>
              {STATUS_OPTIONS.map(s => <DropItem key={s.value} label={s.label} checked={form.status === s.value} onClick={() => { setForm({ ...form, status: s.value }); setOpenDrop(null); }} />)}
            </DropdownBtn>
          </div>

          {/* Reminder */}
          <div className="relative z-[9991]">
            <DropdownBtn open={openDrop === "reminder"} onClick={() => toggle("reminder")}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}>
              {REMINDER_OPTIONS.map(r => <DropItem key={r.value} label={r.label} checked={form.reminder === r.value} onClick={() => { setForm({ ...form, reminder: r.value }); setOpenDrop(null); }} />)}
            </DropdownBtn>
          </div>

          {/* Category */}
          <div className="relative z-[9991]">
            <DropdownBtn open={openDrop === "category"} onClick={() => toggle("category")}
              icon={selectedCategory
                ? <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: selectedCategory.color }} />
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}>
              {CATEGORIES.map(c => <DropItem key={c.label} label={c.label} color={c.color} checked={form.category === c.label} onClick={() => { setForm({ ...form, category: c.label, categoryColor: c.color }); setOpenDrop(null); }} />)}
              {form.category && <><div className="border-t border-gray-100 my-1" /><DropItem label="Clear category" checked={false} onClick={() => { setForm({ ...form, category: "", categoryColor: "" }); setOpenDrop(null); }} /></>}
            </DropdownBtn>
          </div>

          {/* Privacy */}
          <div className="relative z-[9991]">
            <DropdownBtn open={openDrop === "privacy"} onClick={() => toggle("privacy")}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>{form.isPrivate ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />}</svg>}>
              <DropItem label="Private" checked={form.isPrivate} onClick={() => { setForm({ ...form, isPrivate: true }); setOpenDrop(null); }} />
              <DropItem label="Not private" checked={!form.isPrivate} onClick={() => { setForm({ ...form, isPrivate: false }); setOpenDrop(null); }} />
            </DropdownBtn>
          </div>
        </div>

        {/* Body — two panels (Outlook layout) */}
        <div className="flex flex-1 overflow-hidden bg-gray-50">

          {/* Left panel — form */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 p-4 gap-3">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}

            {/* Top card — calendar, title, date, location */}
            <div className="bg-white border border-gray-200 rounded flex-shrink-0">
              {/* Calendar selector row — dropdown */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 relative">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedCalendar?.color ?? "#F97316" }}
                />
                <button
                  type="button"
                  onClick={() => setShowCalendarDrop(!showCalendarDrop)}
                  className="flex items-center gap-1.5 text-[13px] text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedCalendar?.name ?? "Calendar"}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCalendarDrop && (
                  <>
                    <div className="fixed inset-0 z-[9990]" onClick={() => setShowCalendarDrop(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] min-w-[220px] py-1">
                      {calendars.map(cal => (
                        <button
                          key={cal.id}
                          type="button"
                          onClick={() => { setSelectedCalendarId(cal.id); setShowCalendarDrop(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-50 ${selectedCalendarId === cal.id ? "font-semibold" : "text-gray-700"}`}
                        >
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                          <span className="flex-1 truncate">{cal.name}</span>
                          {selectedCalendarId === cal.id && (
                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Title */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100">
                <svg className="w-[18px] h-[18px] text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <input
                  type="text" value={form.title} autoFocus
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Add title"
                  className="flex-1 text-[15px] placeholder-gray-400 focus:outline-none bg-transparent text-gray-900 py-0.5"
                />
              </div>

              {/* Date/time — Outlook style: single text line */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100">
                <svg className="w-[18px] h-[18px] text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  {tab === "series" && form.startAt
                    ? <span className="text-[13px] text-gray-700">{getRecurrenceLabel()}</span>
                    : <div className="flex items-center gap-2 flex-wrap">
                        <input type={form.allDay ? "date" : "datetime-local"}
                          value={form.allDay ? form.startAt.slice(0, 10) : form.startAt}
                          onChange={e => setForm({ ...form, startAt: e.target.value })}
                          className="text-[13px] border-0 px-0 py-0 text-gray-700 focus:outline-none bg-transparent" />
                        <span className="text-gray-400 text-sm">–</span>
                        <input type={form.allDay ? "date" : "datetime-local"}
                          value={form.allDay ? form.endAt.slice(0, 10) : form.endAt}
                          onChange={e => setForm({ ...form, endAt: e.target.value })}
                          className="text-[13px] border-0 px-0 py-0 text-gray-700 focus:outline-none bg-transparent" />
                        <label className="flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer ml-2">
                          <input type="checkbox" checked={form.allDay} onChange={e => setForm({ ...form, allDay: e.target.checked })} className="rounded" />
                          All day
                        </label>
                      </div>
                  }
                </div>
              </div>

              {/* Location with autocomplete */}
              <div className="flex items-center gap-3 px-4 py-2.5 relative">
                <svg className="w-[18px] h-[18px] text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => handleLocationChange(e.target.value)}
                    onFocus={() => form.location.length >= 3 && setShowLocationSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                    placeholder="Search for a location"
                    className="w-full text-[13px] placeholder-gray-400 focus:outline-none bg-transparent text-gray-700 py-0.5"
                    autoComplete="off"
                  />
                  {/* Autocomplete dropdown */}
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] overflow-hidden">
                      {/* "Use this location" option */}
                      {form.location && (
                        <button
                          type="button"
                          onMouseDown={() => { setShowLocationSuggestions(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-blue-600 font-medium hover:bg-blue-50 border-b border-gray-100"
                        >
                          Use this location: {form.location}
                        </button>
                      )}
                      {locationSuggestions.map((s) => {
                        // Split display_name: first part is place name, rest is address
                        const parts = s.display_name.split(", ");
                        const name = parts.slice(0, 2).join(", ");
                        const address = parts.slice(2, 5).join(", ");
                        // Generate initials for avatar
                        const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
                        const colors = ["#e74c3c","#e67e22","#f1c40f","#2ecc71","#3498db","#9b59b6","#1abc9c","#e91e63"];
                        const color = colors[s.place_id.charCodeAt(0) % colors.length];
                        return (
                          <button
                            key={s.place_id}
                            type="button"
                            onMouseDown={() => {
                              setForm({ ...form, location: name });
                              setShowLocationSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: color }}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                              {address && <p className="text-xs text-gray-400 truncate">{address}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Series config card */}
            {tab === "series" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-800">Recurrence settings</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Repeat</label>
                    <select value={recurrence.type} onChange={e => setRecurrence({ ...recurrence, type: e.target.value as RecurrenceConfig["type"] })}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Every</label>
                    <div className="flex items-center gap-1">
                      <input type="number" min={1} max={99} value={recurrence.interval}
                        onChange={e => setRecurrence({ ...recurrence, interval: parseInt(e.target.value) || 1 })}
                        className="w-16 border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                      <span className="text-sm text-gray-500">
                        {recurrence.type === "daily" ? "day(s)" : recurrence.type === "weekly" ? "week(s)" : recurrence.type === "monthly" ? "month(s)" : "year(s)"}
                      </span>
                    </div>
                  </div>
                </div>
                {recurrence.type === "weekly" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">On days</label>
                    <div className="flex gap-1">
                      {DAY_LABELS.map((d, i) => (
                        <button key={d} type="button"
                          onClick={() => { const days = recurrence.daysOfWeek ?? []; setRecurrence({ ...recurrence, daysOfWeek: days.includes(i) ? days.filter(x => x !== i) : [...days, i] }); }}
                          className={`w-8 h-8 text-xs rounded-full font-medium transition-colors ${recurrence.daysOfWeek?.includes(i) ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                          {d[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                  <div className="space-y-1.5">
                    {[{ value: "never", label: "Never" }, { value: "date", label: "End by date" }, { value: "count", label: "End after" }].map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="radio" name="endType" value={opt.value} checked={recurrence.endType === opt.value} onChange={() => setRecurrence({ ...recurrence, endType: opt.value as RecurrenceConfig["endType"] })} />
                        {opt.label}
                        {opt.value === "date" && recurrence.endType === "date" && (
                          <input type="date" value={recurrence.endDate ?? ""} onChange={e => setRecurrence({ ...recurrence, endDate: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-0.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                        )}
                        {opt.value === "count" && recurrence.endType === "count" && (
                          <div className="flex items-center gap-1">
                            <input type="number" min={1} value={recurrence.count ?? 10} onChange={e => setRecurrence({ ...recurrence, count: parseInt(e.target.value) || 1 })}
                              className="w-16 border border-gray-300 rounded px-2 py-0.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                            <span className="text-sm text-gray-500">occurrences</span>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Description — separate card, fills all remaining height */}
            <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded overflow-hidden flex flex-col">
              <RichEditor
                value={form.description}
                onChange={html => setForm({ ...form, description: html })}
                placeholder=""
              />
            </div>
          </div>

          {/* Right panel — day preview (Outlook style: white bg, no gray) */}
          <div className="w-[340px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
            <EventDayPreview date={previewDate} previewEvent={previewEvent} />
          </div>
        </div>
      </div>
    </div>
  );
}
