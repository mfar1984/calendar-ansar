"use client";

import { useState } from "react";

interface Props {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const days: (Date | null)[] = [];

  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default function MiniCalendar({ selectedDate, onSelectDate }: Props) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const today = new Date();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = getMonthGrid(year, month);

  function prevMonth() {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  }

  function nextMonth() {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  }

  return (
    <div className="px-3 py-2 select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 rounded text-gray-500"
          aria-label="Previous month"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-gray-700">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded text-gray-500"
          aria-label="Next month"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = day.getMonth() === month;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={`w-6 h-6 mx-auto text-[11px] rounded-full flex items-center justify-center transition-colors ${
                isSelected
                  ? "bg-blue-600 text-white font-semibold"
                  : isToday
                  ? "border border-blue-500 text-blue-600 font-semibold"
                  : isCurrentMonth
                  ? "text-gray-700 hover:bg-gray-100"
                  : "text-gray-300 hover:bg-gray-50"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
