"use client";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_H = 56; // px per hour (Outlook uses ~56)
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface PreviewEvent {
  title: string;
  startAt: string;
  endAt: string;
  color: string;
  allDay: boolean;
}

interface Props {
  date: Date;
  previewEvent: PreviewEvent | null;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function format12h(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function EventDayPreview({ date, previewEvent }: Props) {
  const now = new Date();
  const isToday = isSameDay(date, now);
  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_H;

  let eventTop = 0, eventHeight = 0;
  if (previewEvent && !previewEvent.allDay) {
    const start = new Date(previewEvent.startAt);
    const end = new Date(previewEvent.endAt);
    eventTop = (start.getHours() + start.getMinutes() / 60) * HOUR_H;
    const dur = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    eventHeight = Math.max(dur * HOUR_H, 24);
  }

  const scrollTarget = previewEvent && !previewEvent.allDay ? eventTop : nowTop;
  const scrollRef = (el: HTMLDivElement | null) => {
    if (el) el.scrollTop = Math.max(0, scrollTarget - 100);
  };

  // Header date format: "Fri, May 22, 2026"
  const headerDate = `${DAY_NAMES_SHORT[date.getDay()]}, ${MONTH_FULL[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header — Outlook style: nav arrows + date */}
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600" title="Today">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="text-[13px] font-semibold text-gray-800 ml-1 flex items-center gap-0.5">
            {headerDate}
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>

        {/* All-day event */}
        {previewEvent?.allDay && (
          <div className="mt-2 px-2 py-1 rounded text-xs text-white truncate" style={{ backgroundColor: previewEvent.color }}>
            {previewEvent.title || "Untitled"}
          </div>
        )}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="flex" style={{ minHeight: `${24 * HOUR_H}px` }}>
          {/* Time labels — 12-hour format */}
          <div className="w-14 flex-shrink-0 relative">
            {HOURS.map(h => (
              <div key={h} className="absolute right-2 text-[11px] text-gray-500 leading-none" style={{ top: h * HOUR_H - 6 }}>
                {h === 0 ? "" : format12h(h)}
              </div>
            ))}
          </div>

          {/* Column */}
          <div className={`flex-1 relative border-l border-gray-200 ${isToday ? "bg-blue-50/20" : "bg-white"}`}>
            {/* Hour lines */}
            {HOURS.map(h => (
              <div key={h} className="absolute w-full border-t border-gray-200" style={{ top: h * HOUR_H }} />
            ))}
            {/* Half-hour dotted lines */}
            {HOURS.map(h => (
              <div key={`half-${h}`} className="absolute w-full" style={{ top: h * HOUR_H + HOUR_H / 2, borderTop: "1px dashed #f3f4f6" }} />
            ))}

            {/* Current time indicator */}
            {isToday && (
              <div className="absolute w-full z-10 pointer-events-none" style={{ top: nowTop }}>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                  <div className="flex-1 border-t-[2px] border-red-500" />
                </div>
              </div>
            )}

            {/* Preview event — Outlook style: time inside event */}
            {previewEvent && !previewEvent.allDay && (
              <div
                className="absolute left-1 right-1 rounded px-2 py-1 z-20 overflow-hidden shadow-sm"
                style={{ top: eventTop, height: eventHeight, backgroundColor: previewEvent.color }}
              >
                <div className="text-white text-[12px] font-semibold truncate leading-tight">
                  {formatTime(new Date(previewEvent.startAt))} - {formatTime(new Date(previewEvent.endAt))}
                </div>
                {eventHeight > 36 && previewEvent.title && (
                  <div className="text-white text-[11px] opacity-90 truncate mt-0.5">
                    {previewEvent.title}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
