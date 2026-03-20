"use client";

import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { usePostStore } from "@/stores/post-store";

interface DateGroupHeaderProps {
  date: string;
  count: number;
}

export function DateGroupHeader({ date, count }: DateGroupHeaderProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const { setCurrentDate, dateCounts } = usePostStore();

  const dateObj = new Date(date);
  const formatted = format(dateObj, "yyyy/MM/dd (E)", { locale: ja });

  const handlePrevDate = () => {
    const prev = subDays(dateObj, 1);
    setCurrentDate(format(prev, "yyyy-MM-dd"));
  };

  const handleNextDate = () => {
    const next = addDays(dateObj, 1);
    setCurrentDate(format(next, "yyyy-MM-dd"));
  };

  const handleDateSelect = (selectedDate: Date) => {
    setCurrentDate(format(selectedDate, "yyyy-MM-dd"));
    setShowCalendar(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 py-3 px-1 sticky top-16 bg-[hsl(var(--background))] z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handlePrevDate}
          aria-label="前の日"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <button
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          onClick={() => setShowCalendar(!showCalendar)}
        >
          <CalendarDays className="h-5 w-5 text-[hsl(var(--primary))]" />
          <h2 className="text-base font-bold text-[hsl(var(--foreground))]">
            {formatted}
          </h2>
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {count}件
          </span>
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleNextDate}
          aria-label="次の日"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {showCalendar && (
        <div className="absolute left-0 top-full mt-1 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))] shadow-lg z-20">
          <Calendar
            selected={dateObj}
            onSelect={handleDateSelect}
            dateCounts={dateCounts}
          />
        </div>
      )}
    </div>
  );
}
