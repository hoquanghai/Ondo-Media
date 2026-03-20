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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">
            {typeof value === "number" ? value.toLocaleString() : value}
            {suffix && <span className="text-sm font-normal text-gray-500 ml-0.5">{suffix}</span>}
          </p>
        </div>
        <div
          className={`h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center ${color}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
