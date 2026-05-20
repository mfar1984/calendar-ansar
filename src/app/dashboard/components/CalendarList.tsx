"use client";

import type { Calendar } from "../DashboardClient";

interface Props {
  calendars: Calendar[];
  sharedCalendars: Calendar[];
  selectedId: string | null;
  userId: string;
  onSelect: (cal: Calendar) => void;
  onEdit: (cal: Calendar) => void;
  onShare: (cal: Calendar) => void;
  onShareLinks: (cal: Calendar) => void;
  onDelete: (cal: Calendar) => void;
}

function CalendarItem({
  cal,
  isSelected,
  isOwner,
  onSelect,
  onEdit,
  onShare,
  onShareLinks,
  onDelete,
}: {
  cal: Calendar;
  isSelected: boolean;
  isOwner: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onShare: () => void;
  onShareLinks: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
      }`}
      onClick={onSelect}
    >
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: cal.color }}
      />
      <span className="flex-1 text-sm truncate">{cal.name}</span>
      {cal._count && (
        <span className="text-xs text-gray-400">{cal._count.events}</span>
      )}

      {/* Actions — show on hover */}
      <div
        className="hidden group-hover:flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onShareLinks}
          title="Share links"
          className="p-1 text-gray-400 hover:text-blue-500 rounded"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
        {isOwner && (
          <>
            <button
              onClick={onShare}
              title="Share with users"
              className="p-1 text-gray-400 hover:text-green-500 rounded"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={onEdit}
              title="Edit calendar"
              className="p-1 text-gray-400 hover:text-yellow-500 rounded"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              title="Delete calendar"
              className="p-1 text-gray-400 hover:text-red-500 rounded"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CalendarList({
  calendars,
  sharedCalendars,
  selectedId,
  userId,
  onSelect,
  onEdit,
  onShare,
  onShareLinks,
  onDelete,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2 mb-1">
          My Calendars
        </p>
        {calendars.length === 0 ? (
          <p className="text-xs text-gray-400 px-2">No calendars yet</p>
        ) : (
          calendars.map((cal) => (
            <CalendarItem
              key={cal.id}
              cal={cal}
              isSelected={selectedId === cal.id}
              isOwner={cal.userId === userId}
              onSelect={() => onSelect(cal)}
              onEdit={() => onEdit(cal)}
              onShare={() => onShare(cal)}
              onShareLinks={() => onShareLinks(cal)}
              onDelete={() => onDelete(cal)}
            />
          ))
        )}
      </div>

      {sharedCalendars.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2 mb-1">
            Shared With Me
          </p>
          {sharedCalendars.map((cal) => (
            <CalendarItem
              key={cal.id}
              cal={cal}
              isSelected={selectedId === cal.id}
              isOwner={false}
              onSelect={() => onSelect(cal)}
              onEdit={() => onEdit(cal)}
              onShare={() => onShare(cal)}
              onShareLinks={() => onShareLinks(cal)}
              onDelete={() => onDelete(cal)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
