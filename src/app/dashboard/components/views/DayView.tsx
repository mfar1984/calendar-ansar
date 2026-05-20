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
const HOUR_HEIGHT = 64;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getEventTop(event: CalendarEvent): number {
  const start = new Date(event.startAt);
  return (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT;
}

function getEventHeight(event: CalendarEvent): number {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.max(durationHours * HOUR_HEIGHT, 24);
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function DayView({
  currentDate,
  events,
  calendarColorMap,
  canWrite,
  onEditEvent,
  onNewEvent,
}: Props) {
  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  const dayEvents = events.filter((e) => {
    const start = new Date(e.startAt);
    return isSameDay(start, currentDate) && !e.allDay;
  });

  const allDayEvents = events.filter((e) => {
    const start = new Date(e.startAt);
    return isSameDay(start, currentDate) && e.allDay;
  });

  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`text-3xl font-bold w-12 h-12 flex items-center justify-center rounded-full ${
              isToday ? "bg-blue-600 text-white" : "text-gray-800"
            }`}
          >
            {currentDate.getDate()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              {DAY_NAMES[currentDate.getDay()]}
            </div>
            <div className="text-sm text-gray-400">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
          </div>
        </div>

        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="mt-2 space-y-1">
            {allDayEvents.map((e) => {
              const color = calendarColorMap[e.calendarId] ?? "#3B82F6";
              return (
                <div
                  key={e.id}
                  onClick={() => onEditEvent(e)}
                  className="text-sm px-2 py-1 rounded cursor-pointer hover:opacity-80 text-white"
                  style={{ backgroundColor: color }}
                >
                  {e.title}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 relative border-r border-gray-200">
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

          {/* Events column */}
          <div
            className={`flex-1 relative ${isToday ? "bg-blue-50/20" : "bg-white"}`}
            onClick={(e) => {
              if (!canWrite) return;
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const y = e.clientY - rect.top;
              const hour = Math.floor(y / HOUR_HEIGHT);
              const d = new Date(currentDate);
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

            {/* Half-hour lines */}
            {HOURS.map((h) => (
              <div
                key={`half-${h}`}
                className="absolute w-full border-t border-gray-50"
                style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
              />
            ))}

            {/* Current time indicator */}
            {isToday && (
              <div
                className="absolute w-full z-10 pointer-events-none"
                style={{ top: nowTop }}
              >
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 -ml-1.5 flex-shrink-0" />
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
              const endTime = new Date(event.endAt).toLocaleTimeString("en-MY", {
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
                  className="absolute left-1 right-2 rounded-lg px-2 py-1 cursor-pointer hover:opacity-90 overflow-hidden z-20 shadow-sm"
                  style={{
                    top,
                    height,
                    backgroundColor: color,
                    color: "#fff",
                  }}
                  title={event.title}
                >
                  <div className="font-semibold text-sm truncate">{event.title}</div>
                  {height > 36 && (
                    <div className="text-xs opacity-80">
                      {startTime} – {endTime}
                    </div>
                  )}
                  {height > 56 && event.location && (
                    <div className="text-xs opacity-70 truncate">📍 {event.location}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
