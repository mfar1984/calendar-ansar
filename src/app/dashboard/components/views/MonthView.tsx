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
  onNavigateDay: (d: Date) => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGrid(year: number, month: number): Date[] {
  // Grid starts on Monday
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Day of week for first day (0=Sun..6=Sat), convert to Mon-based (0=Mon..6=Sun)
  const startDow = (firstDay.getDay() + 6) % 7;
  const endDow = (lastDay.getDay() + 6) % 7;

  const days: Date[] = [];

  // Days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Days from next month to complete last row
  const remaining = 7 - ((endDow + 1) % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push(new Date(year, month + 1, d));
    }
  }

  return days;
}

export default function MonthView({
  currentDate,
  events,
  calendarColorMap,
  canWrite,
  onEditEvent,
  onDeleteEvent,
  onNewEvent,
  onNavigateDay,
}: Props) {
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getMonthGrid(year, month);

  function getEventsForDay(day: Date): CalendarEvent[] {
    return events.filter((e) => {
      const start = new Date(e.startAt);
      return isSameDay(start, day);
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 overflow-y-auto" style={{ gridAutoRows: "minmax(100px, 1fr)" }}>
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={idx}
              className={`border-r border-b border-gray-200 p-1 min-h-[100px] ${
                isCurrentMonth ? "bg-white" : "bg-gray-50"
              } ${canWrite ? "cursor-pointer" : ""}`}
              onClick={() => canWrite && onNewEvent(new Date(day.setHours(9, 0, 0, 0)))}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateDay(day);
                  }}
                  className={`w-6 h-6 text-xs font-medium rounded-full flex items-center justify-center transition-colors ${
                    isToday
                      ? "bg-blue-600 text-white"
                      : isCurrentMonth
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {day.getDate()}
                </button>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const color = calendarColorMap[event.calendarId] ?? "#3B82F6";
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
                      className="flex items-center gap-1 px-1 py-0.5 rounded text-xs cursor-pointer hover:opacity-80 truncate"
                      style={{ backgroundColor: color + "22", borderLeft: `3px solid ${color}` }}
                      title={event.title}
                    >
                      {!event.allDay && (
                        <span className="text-gray-500 flex-shrink-0">{startTime}</span>
                      )}
                      <span className="truncate font-medium" style={{ color }}>
                        {event.title}
                      </span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div
                    className="text-xs text-blue-600 px-1 cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateDay(day);
                    }}
                  >
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
