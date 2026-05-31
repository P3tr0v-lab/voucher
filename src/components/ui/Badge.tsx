import { cn } from "@/lib/utils";

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      variant === "default" && "bg-slate-700 text-slate-300",
      variant === "success" && "bg-green-900/50 text-green-400 border border-green-800",
      variant === "warning" && "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
      variant === "danger" && "bg-red-900/50 text-red-400 border border-red-800",
    )}>
      {children}
    </span>
  );
}
