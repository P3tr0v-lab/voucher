"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/States";
import { formatCurrency, currentMonth } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import type { Site } from "@/lib/types";

export default function AnalyticsPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSite, setFilterSite] = useState("");
  const { month, year } = currentMonth();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: s }, { data: si }] = await Promise.all([
        supabase.from("daily_sales").select("*,sites(name)").eq("user_id", user!.id).order("date"),
        supabase.from("sites").select("*").eq("user_id", user!.id).eq("status", "active"),
      ]);
      setSales(s || []);
      setSites(si || []);
      setLoading(false);
    })();
  }, []);

  const filtered = filterSite ? sales.filter(s => s.site_id === filterSite) : sales;
  const monthSales = filtered.filter(s => s.date >= monthStart);

  // Daily revenue line chart data
  const dailyData = monthSales.map(s => ({
    date: s.date.slice(5),
    revenue: s.total_revenue,
    "500 TSH": s.used_500,
    "1000 TSH": s.used_1000,
  }));

  // Monthly revenue grouped
  const monthlyMap: Record<string, number> = {};
  filtered.forEach(s => {
    const key = s.date.slice(0, 7);
    monthlyMap[key] = (monthlyMap[key] || 0) + s.total_revenue;
  });
  const monthlyData = Object.entries(monthlyMap).sort().map(([month, revenue]) => ({ month, revenue }));

  // Site comparison
  const siteRevMap: Record<string, { name: string; revenue: number }> = {};
  sales.filter(s => s.date >= monthStart).forEach(s => {
    if (!siteRevMap[s.site_id]) siteRevMap[s.site_id] = { name: s.sites?.name || s.site_id, revenue: 0 };
    siteRevMap[s.site_id].revenue += s.total_revenue;
  });
  const siteData = Object.values(siteRevMap).sort((a, b) => b.revenue - a.revenue);

  // Insights
  const topSite = siteData[0];
  const bottomSite = siteData[siteData.length - 1];
  const total500 = monthSales.reduce((s, r) => s + r.used_500, 0);
  const total1000 = monthSales.reduce((s, r) => s + r.used_1000, 0);
  const mostSold = total500 > total1000 ? "500 TSH" : "1000 TSH";
  const avgDaily = monthSales.length > 0 ? monthSales.reduce((s, r) => s + r.total_revenue, 0) / monthSales.length : 0;

  const tooltipStyle = { backgroundColor: "#1e293b", border: "1px solid #334155", color: "#f1f5f9" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm">Visual insights for your business</p>
        </div>
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none">
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Insights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Top Site (Month)", value: topSite?.name || "—" },
              { label: "Most Sold Type", value: mostSold },
              { label: "Avg Daily Revenue", value: formatCurrency(avgDaily) },
              { label: "Bottom Site", value: bottomSite?.name || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs">{label}</p>
                <p className="text-white font-semibold mt-1 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Daily Revenue */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-base font-semibold text-white mb-4">Daily Revenue (This Month)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Voucher Usage */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-base font-semibold text-white mb-4">Voucher Usage by Day</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="500 TSH" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="1000 TSH" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-base font-semibold text-white mb-4">Monthly Revenue</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Site Comparison */}
          {siteData.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h2 className="text-base font-semibold text-white mb-4">Site Revenue Comparison (This Month)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={siteData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
