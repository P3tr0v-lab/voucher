import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}

export function StatCard({ title, value, sub, icon, color = "bg-blue-600" }: StatCardProps) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-start gap-3">
      <div className={cn("p-2 rounded-lg shrink-0", color)}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide leading-tight">{title}</p>
        <p className="text-lg md:text-2xl font-bold text-white mt-0.5 truncate">{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
