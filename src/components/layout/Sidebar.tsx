"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, MapPin, Package, ShoppingCart,
  BarChart3, FileText, Boxes, DollarSign, Database, Wifi, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/sites", label: "Sites", icon: MapPin },
  { href: "/dashboard/batches", label: "Batches", icon: Package },
  { href: "/dashboard/sales", label: "Daily Sales", icon: ShoppingCart },
  { href: "/dashboard/inventory", label: "Inventory", icon: Boxes },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/expenses", label: "Expenses", icon: DollarSign },
  { href: "/dashboard/backup", label: "Backup", icon: Database },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === href
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {label}
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-900 border-r border-slate-800 shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
          <div className="p-1.5 rounded-lg bg-blue-600">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-sm text-white leading-tight">Hotspot Voucher<br />Manager</span>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          <NavLinks />
        </nav>
      </aside>

      {/* Mobile hamburger button — rendered inside TopBar via a portal-like approach */}
      {/* We expose a toggle button that TopBar can use via a global event, but simpler: */}
      {/* Mobile drawer trigger is in TopBar, drawer is here */}

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-50 flex flex-col transition-transform duration-200 md:hidden",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-sm text-white leading-tight">Hotspot Voucher<br />Manager</span>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          <NavLinks onClick={() => setOpen(false)} />
        </nav>
      </div>

      {/* Mobile menu button — fixed bottom-right FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 md:hidden p-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/50 transition"
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  );
}
