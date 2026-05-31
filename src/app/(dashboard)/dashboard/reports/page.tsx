"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/States";
import { formatDate, formatCurrency, currentMonth } from "@/lib/utils";
import { Download } from "lucide-react";
import type { Site } from "@/lib/types";

export default function ReportsPage() {
  const [tab, setTab] = useState<"daily" | "monthly">("daily");
  const [sites, setSites] = useState<Site[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSite, setFilterSite] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const supabase = createClient();

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: s }, { data: si }] = await Promise.all([
      supabase.from("daily_sales").select("*,sites(name)").eq("user_id", user!.id).order("date", { ascending: false }),
      supabase.from("sites").select("*").eq("user_id", user!.id),
    ]);
    setSales(s || []);
    setSites(si || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = sales.filter(s => {
    const inSite = !filterSite || s.site_id === filterSite;
    const inYear = !filterYear || s.date.startsWith(filterYear);
    const inMonth = !filterMonth || s.date.slice(5, 7) === String(filterMonth).padStart(2, "0");
    return inSite && inYear && inMonth;
  });

  // Monthly aggregation per site
  const monthlyBySite = sites.map(site => {
    const siteSales = filtered.filter(s => s.site_id === site.id);
    if (siteSales.length === 0) return null;
    const totalRev = siteSales.reduce((s, r) => s + r.total_revenue, 0);
    const totalVouchers = siteSales.reduce((s, r) => s + r.used_500 + r.used_1000, 0);
    const best = siteSales.reduce((a, b) => a.total_revenue > b.total_revenue ? a : b);
    const worst = siteSales.reduce((a, b) => a.total_revenue < b.total_revenue ? a : b);
    const avgDaily = totalRev / siteSales.length;
    return { site, totalRev, totalVouchers, best, worst, avgDaily };
  }).filter(Boolean);

  function exportCSV() {
    const rows = [
      ["Date", "Site", "500 TSH Used", "1000 TSH Used", "Revenue 500", "Revenue 1000", "Total Revenue"],
      ...filtered.map(s => [s.date, s.sites?.name, s.used_500, s.used_1000, s.revenue_500, s.revenue_1000, s.total_revenue])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sales_report.csv"; a.click();
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(filtered.map(s => ({
      Date: s.date, Site: s.sites?.name, "500 Used": s.used_500, "1000 Used": s.used_1000,
      "Rev 500": s.revenue_500, "Rev 1000": s.revenue_1000, "Total": s.total_revenue
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, "sales_report.xlsx");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400 text-sm">Daily and monthly sales reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none">
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none">
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "long" })}</option>
          ))}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none">
          <option value="">All Years</option>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          {(["daily", "monthly"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize transition ${tab === t ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : tab === "daily" ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Site</th>
                <th className="px-4 py-3 text-right">500 TSH</th>
                <th className="px-4 py-3 text-right">1000 TSH</th>
                <th className="px-4 py-3 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No data for selected filters.</td></tr>
              ) : filtered.map((s: any) => (
                <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                  <td className="px-4 py-3 text-slate-300">{formatDate(s.date)}</td>
                  <td className="px-4 py-3 text-white">{s.sites?.name}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{s.used_500}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{s.used_1000}</td>
                  <td className="px-4 py-3 text-right text-green-400 font-medium">{formatCurrency(s.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {monthlyBySite.length === 0 ? (
            <div className="text-center text-slate-500 py-12">No data for selected month.</div>
          ) : monthlyBySite.map((m: any) => (
            <div key={m.site.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h3 className="text-lg font-semibold text-white mb-4">{m.site.name}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-slate-500 text-xs">Total Revenue</p><p className="text-green-400 font-bold text-lg">{formatCurrency(m.totalRev)}</p></div>
                <div><p className="text-slate-500 text-xs">Vouchers Sold</p><p className="text-white font-bold text-lg">{m.totalVouchers}</p></div>
                <div><p className="text-slate-500 text-xs">Avg Daily Revenue</p><p className="text-white font-bold text-lg">{formatCurrency(m.avgDaily)}</p></div>
                <div><p className="text-slate-500 text-xs">Best Day</p><p className="text-white">{formatDate(m.best.date)} — {formatCurrency(m.best.total_revenue)}</p></div>
                <div><p className="text-slate-500 text-xs">Lowest Day</p><p className="text-white">{formatDate(m.worst.date)} — {formatCurrency(m.worst.total_revenue)}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
