"use client";

import type { CalendarEvent } from "../DashboardClient";

interface Props {
  events: CalendarEvent[];
  canWrite: boolean;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}

function formatDate(dateStr: string, allDay: boolean): string {
  const date = new Date(dateStr);
  if (allDay) {
    return date.toLocaleDateString("en-MY", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleString("en-MY", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventList({ events, canWrite, onEdit, onDelete }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p>No events yet</p>
          {canWrite && <p className="text-sm mt-1">Click &quot;+ Add Event&quot; to create one</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start justify-between hover:border-blue-200 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{event.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatDate(event.startAt, event.allDay)}
                {!event.allDay && ` → ${formatDate(event.endAt, false)}`}
              </p>
              {event.location && (
                <p className="text-sm text-gray-400 mt-0.5 truncate">
                  📍 {event.location}
                </p>
              )}
              {event.description && (
                <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>

            {canWrite && (
              <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                <button
                  onClick={() => onEdit(event)}
                  className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
                  title="Edit event"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(event)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                  title="Delete event"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
