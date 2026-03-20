import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  suffix?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-[hsl(var(--primary))]",
  suffix,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {label}
            </p>
            <p className="text-2xl font-bold mt-1">
              {value}
              {suffix && <span className="text-sm ml-1">{suffix}</span>}
            </p>
          </div>
          <div
            className={`h-10 w-10 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center ${color}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
