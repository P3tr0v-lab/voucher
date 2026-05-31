"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const pageTitle: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/sites": "Sites",
  "/dashboard/batches": "Batches",
  "/dashboard/sales": "Daily Sales",
  "/dashboard/inventory": "Inventory",
  "/dashboard/reports": "Reports",
  "/dashboard/analytics": "Analytics",
  "/dashboard/expenses": "Expenses",
  "/dashboard/backup": "Backup",
};

export default function TopBar({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
      <div>
        <p className="text-white font-semibold text-sm md:hidden">{pageTitle[pathname] || "Dashboard"}</p>
        <p className="hidden md:block text-sm text-slate-400">
          Welcome, <span className="text-white font-medium">{user.email}</span>
        </p>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
