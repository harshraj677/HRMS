"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mockCalendarEvents } from "@/lib/mock-data";
import type { CalendarEvent } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const eventTypeStyles: Record<CalendarEvent["type"], { dot: string; badge: string; label: string }> = {
  leave: { dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700", label: "Leave" },
  holiday: { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", label: "Holiday" },
  meeting: { dot: "bg-violet-500", badge: "bg-violet-100 text-violet-700", label: "Meeting" },
  event: { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700", label: "Event" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  const getEventsForDate = (day: number): CalendarEvent[] => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return mockCalendarEvents.filter(e => e.date === dateStr || (e.endDate && dateStr >= e.date && dateStr <= e.endDate));
  };

  const selectedEvents = selectedDate
    ? mockCalendarEvents.filter(e =>
        e.date === selectedDate ||
        (e.endDate && selectedDate >= e.date && selectedDate <= e.endDate)
      )
    : [];

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  const isSelected = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr === selectedDate;
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
  };

  // Build grid cells: empty prefix + days
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  // Pad end to fill grid rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leave Calendar</h2>
          <p className="text-sm text-slate-500 mt-0.5">View leaves, holidays, and events</p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(eventTypeStyles).map(([type, s]) => (
            <span key={type} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className={cn("w-2.5 h-2.5 rounded-full", s.dot)} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          {/* Month Nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                {MONTHS[viewMonth]} {viewYear}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday} className="rounded-xl text-xs h-8">
                Today
              </Button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map(d => (
              <div key={d} className="text-center py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[90px] border-b border-r border-slate-50" />;
              const events = getEventsForDate(day);
              return (
                <motion.div
                  key={day}
                  whileHover={{ backgroundColor: "#f8fafc" }}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "min-h-[90px] p-2 border-b border-r border-slate-50 cursor-pointer transition-colors relative",
                    isSelected(day) && "bg-indigo-50 border-indigo-200"
                  )}
                >
                  <span className={cn(
                    "inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full mb-1",
                    isToday(day) && "bg-indigo-600 text-white",
                    !isToday(day) && "text-slate-700 hover:bg-slate-100",
                    isSelected(day) && !isToday(day) && "bg-indigo-100 text-indigo-700"
                  )}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {events.slice(0, 2).map(e => (
                      <div
                        key={e.id}
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded truncate",
                          eventTypeStyles[e.type].badge
                        )}
                      >
                        {e.title}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <p className="text-[10px] text-slate-400 px-1">+{events.length - 2} more</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Side Panel: Selected Day Events */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-4"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              {selectedDate
                ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
                : "Select a date"}
            </h3>
          </div>
          <div className="p-4">
            <AnimatePresence mode="wait">
              {selectedDate && selectedEvents.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-center py-8 text-slate-400"
                >
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                  <p className="text-sm">No events on this day</p>
                </motion.div>
              )}
              {!selectedDate && (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-center py-8 text-slate-400"
                >
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                  <p className="text-sm">Click on a date to see events</p>
                </motion.div>
              )}
              {selectedEvents.length > 0 && (
                <motion.div
                  key="events"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {selectedEvents.map((e, i) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-3 p-3 rounded-xl border border-slate-100"
                    >
                      <span className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", eventTypeStyles[e.type].dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{e.title}</p>
                        {e.employeeName && (
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{e.employeeName}</p>
                        )}
                        <span className={cn(
                          "inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 capitalize",
                          eventTypeStyles[e.type].badge
                        )}>
                          {e.type}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Upcoming Events */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Upcoming</h4>
            <div className="space-y-2">
              {mockCalendarEvents
                .filter(e => e.date >= new Date().toISOString().split("T")[0])
                .slice(0, 4)
                .map(e => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", eventTypeStyles[e.type].dot)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{e.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(e.date + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
