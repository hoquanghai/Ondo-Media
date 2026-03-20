"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ja } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CalendarProps {
  className?: string;
  selected?: Date;
  onSelect?: (date: Date) => void;
  dateCounts?: Record<string, number>;
}

function Calendar({ className, selected, onSelect, dateCounts }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected || new Date(),
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ja });
  const calendarEnd = endOfWeek(monthEnd, { locale: ja });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          {format(currentMonth, "yyyy年M月", { locale: ja })}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-xs font-medium text-[hsl(var(--muted-foreground))] py-1"
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const count = dateCounts?.[dateKey];
          const isSelected = selected && isSameDay(day, selected);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);

          return (
            <button
              key={dateKey}
              onClick={() => onSelect?.(day)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-md p-1 text-sm transition-colors hover:bg-[hsl(var(--accent))]",
                !isCurrentMonth && "text-[hsl(var(--muted-foreground))]/50",
                isSelected &&
                  "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]",
                isTodayDate &&
                  !isSelected &&
                  "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
              )}
            >
              <span>{format(day, "d")}</span>
              {count !== undefined && count > 0 && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[hsl(var(--primary))]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
