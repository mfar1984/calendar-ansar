"use client";

import { useState, useCallback } from "react";
import type { CalendarEvent, Calendar } from "../DashboardClient";
import MonthView from "./views/MonthView";
import WeekView from "./views/WeekView";
import DayView from "./views/DayView";

export type ViewMode = "month" | "week" | "day";

interface Props {
  events: CalendarEvent[];
  calendars: Calendar[];
  canWrite: boolean;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
  onNewEvent: (startAt?: Date) => void;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function CalendarGrid({
  events,
  calendars,
  canWrite,
  onEditEvent,
  onDeleteEvent,
  onNewEvent,
}: Props) {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Build a map of calendarId -> color for event coloring
  const calendarColorMap = Object.fromEntries(
    calendars.map((c) => [c.id, c.color])
  );

  function navigate(direction: -1 | 1) {
    const d = new Date(currentDate);
    if (view === "month") {
      d.setMonth(d.getMonth() + direction);
    } else if (view === "week") {
      d.setDate(d.getDate() + direction * 7);
    } else {
      d.setDate(d.getDate() + direction);
    }
    setCurrentDate(d);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function getTitle(): string {
    if (view === "month") {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (view === "week") {
      // Get Monday of current week
      const monday = new Date(currentDate);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(monday.getDate() + diff);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      if (monday.getMonth() === sunday.getMonth()) {
        return `${MONTH_NAMES[monday.getMonth()]} ${monday.getDate()} – ${sunday.getDate()}, ${monday.getFullYear()}`;
      }
      return `${MONTH_NAMES[monday.getMonth()]} ${monday.getDate()} – ${MONTH_NAMES[sunday.getMonth()]} ${sunday.getDate()}, ${monday.getFullYear()}`;
    }
    // day
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white">
        {/* Today button */}
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium"
        >
          Today
        </button>

        {/* Prev / Next */}
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
            aria-label="Previous"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
            aria-label="Next"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold text-gray-800 min-w-[200px]">
          {getTitle()}
        </h2>

        <div className="flex-1" />

        {/* View switcher */}
        <div className="flex border border-gray-300 rounded overflow-hidden text-sm">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 capitalize font-medium transition-colors ${
                view === v
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {canWrite && (
          <button
            onClick={() => onNewEvent()}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
          >
            + New event
          </button>
        )}
      </div>

      {/* Calendar view */}
      <div className="flex-1 overflow-hidden">
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            events={events}
            calendarColorMap={calendarColorMap}
            canWrite={canWrite}
            onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent}
            onNewEvent={onNewEvent}
            onNavigateDay={(d) => { setCurrentDate(d); setView("day"); }}
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            events={events}
            calendarColorMap={calendarColorMap}
            canWrite={canWrite}
            onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent}
            onNewEvent={onNewEvent}
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate}
            events={events}
            calendarColorMap={calendarColorMap}
            canWrite={canWrite}
            onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent}
            onNewEvent={onNewEvent}
          />
        )}
      </div>
    </div>
  );
}
