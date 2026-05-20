"use client";

import type { CalendarEvent } from "../../DashboardClient";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  calendarColorMap: Record<string, string>;
  canWrite: boolean;
  onEditEvent: (e: CalendarEvent) => void;
  onDeleteEvent: (e: CalendarEvent) => void;
  onNewEvent: (startAt?: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(dd.getDate() + i);
    return dd;
  });
}

function getEventTop(event: CalendarEvent): number {
  const start = new Date(event.startAt);
  return (start.getHours() + start.getMinutes() / 60) * 60; // 60px per hour
}

function getEventHeight(event: CalendarEvent): number {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.max(durationHours * 60, 20); // min 20px
}

export default function WeekView({
  currentDate,
  events,
  calendarColorMap,
  canWrite,
  onEditEvent,
  onNewEvent,
}: Props) {
  const today = new Date();
  const weekDays = getWeekDays(currentDate);
  const HOUR_HEIGHT = 60; // px per hour

  function getEventsForDay(day: Date): CalendarEvent[] {
    return events.filter((e) => {
      const start = new Date(e.startAt);
      return isSameDay(start, day) && !e.allDay;
    });
  }

  function getAllDayEventsForDay(day: Date): CalendarEvent[] {
    return events.filter((e) => {
      const start = new Date(e.startAt);
      return isSameDay(start, day) && e.allDay;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header row — day names */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
        {/* Time gutter */}
        <div className="w-14 flex-shrink-0" />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          const allDayEvts = getAllDayEventsForDay(day);
          return (
            <div key={i} className="flex-1 border-l border-gray-200 min-w-0">
              <div className={`py-2 text-center ${isToday ? "bg-blue-50" : ""}`}>
                <div className="text-xs text-gray-500 uppercase">{DAY_NAMES_SHORT[i]}</div>
                <div
                  className={`text-lg font-semibold mx-auto w-8 h-8 flex items-center justify-center rounded-full ${
                    isToday ? "bg-blue-600 text-white" : "text-gray-800"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
              {/* All-day events */}
              {allDayEvts.length > 0 && (
                <div className="px-1 pb-1 space-y-0.5">
                  {allDayEvts.map((e) => {
                    const color = calendarColorMap[e.calendarId] ?? "#3B82F6";
                    return (
                      <div
                        key={e.id}
                        onClick={() => onEditEvent(e)}
                        className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: color, color: "#fff" }}
                      >
                        {e.title}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
          {/* Time labels */}
          <div className="w-14 flex-shrink-0 relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-xs text-gray-400"
                style={{ top: h * HOUR_HEIGHT - 8 }}
              >
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            const dayEvents = getEventsForDay(day);
            const now = new Date();
            const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;

            return (
              <div
                key={i}
                className={`flex-1 border-l border-gray-200 relative min-w-0 ${
                  isToday ? "bg-blue-50/30" : "bg-white"
                }`}
                onClick={(e) => {
                  if (!canWrite) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const hour = Math.floor(y / HOUR_HEIGHT);
                  const d = new Date(day);
                  d.setHours(hour, 0, 0, 0);
                  onNewEvent(d);
                }}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-gray-100"
                    style={{ top: h * HOUR_HEIGHT }}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && (
                  <div
                    className="absolute w-full z-10 pointer-events-none"
                    style={{ top: nowTop }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 -ml-1 flex-shrink-0" />
                      <div className="flex-1 border-t-2 border-blue-500" />
                    </div>
                  </div>
                )}

                {/* Events */}
                {dayEvents.map((event) => {
                  const color = calendarColorMap[event.calendarId] ?? "#3B82F6";
                  const top = getEventTop(event);
                  const height = getEventHeight(event);
                  const startTime = new Date(event.startAt).toLocaleTimeString("en-MY", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });

                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEvent(event);
                      }}
                      className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-xs cursor-pointer hover:opacity-90 overflow-hidden z-20"
                      style={{
                        top,
                        height,
                        backgroundColor: color,
                        color: "#fff",
                      }}
                      title={event.title}
                    >
                      <div className="font-semibold truncate">{event.title}</div>
                      {height > 30 && (
                        <div className="opacity-80">{startTime}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
