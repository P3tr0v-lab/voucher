"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowNotif(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadNotifications() {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", u.id)
      .eq("is_read", false).order("created_at", { ascending: false }).limit(20);
    setNotifications(data || []);
  }

  async function markAllRead() {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", u.id).eq("is_read", false);
    setNotifications([]);
    setShowNotif(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const unread = notifications.length;

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
      <div>
        <p className="text-white font-semibold text-sm md:hidden">{pageTitle[pathname] || "Dashboard"}</p>
        <p className="hidden md:block text-sm text-slate-400">
          Welcome, <span className="text-white font-medium">{user.email}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={ref}>
          <button onClick={() => setShowNotif(v => !v)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-10 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <span className="text-white font-medium text-sm">Notifications</span>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300 transition">Mark all read</button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6">No new notifications</p>
                ) : notifications.map(n => (
                  <div key={n.id} className="px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                    <p className="text-slate-200 text-xs leading-relaxed">{n.message}</p>
                    <p className="text-slate-500 text-xs mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
