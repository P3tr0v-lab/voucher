import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, todayISO, currentMonth } from "@/lib/utils";
import { TrendingUp, MapPin, Boxes, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;
  const today = todayISO();
  const { month, year } = currentMonth();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;

  const [
    { data: sites },
    { data: todaySales },
    { data: monthSales },
    { data: batches },
    { data: recentSales },
  ] = await Promise.all([
    supabase.from("sites").select("*").eq("user_id", uid),
    supabase.from("daily_sales").select("total_revenue").eq("user_id", uid).eq("date", today),
    supabase.from("daily_sales").select("total_revenue,used_500,used_1000").eq("user_id", uid).gte("date", monthStart),
    supabase.from("voucher_batches").select("*").eq("user_id", uid).eq("is_exhausted", false),
    supabase.from("daily_sales").select("*,sites(name)").eq("user_id", uid).order("date", { ascending: false }).limit(10),
  ]);

  const activeSites = (sites || []).filter(s => s.status === "active");
  const todayRevenue = (todaySales || []).reduce((s, r) => s + r.total_revenue, 0);
  const monthRevenue = (monthSales || []).reduce((s, r) => s + r.total_revenue, 0);
  const monthVouchers = (monthSales || []).reduce((s, r) => s + r.used_500 + r.used_1000, 0);
  const totalRemaining = (batches || []).reduce((s, b) => s + b.quantity_remaining, 0);
  const lowStock = (batches || []).filter(b => b.quantity_remaining < 10);

  // Per-site month revenue
  const siteRevMap: Record<string, number> = {};
  const siteInvMap: Record<string, number> = {};
  (monthSales || []).forEach((s: any) => {
    siteRevMap[s.site_id] = (siteRevMap[s.site_id] || 0) + s.total_revenue;
  });
  (batches || []).forEach((b: any) => {
    siteInvMap[b.site_id] = (siteInvMap[b.site_id] || 0) + b.quantity_remaining;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">Overview of all your hotspot sites</p>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="p-4 rounded-xl bg-yellow-900/30 border border-yellow-700 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-medium text-sm">Low Stock Warning</p>
            <p className="text-yellow-400/80 text-xs mt-0.5">
              {lowStock.map(b => `${b.batch_name} (${b.quantity_remaining} left)`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Today's Revenue" value={formatCurrency(todayRevenue)} icon={<DollarSign className="w-5 h-5 text-white" />} color="bg-green-600" />
        <StatCard title="Month Revenue" value={formatCurrency(monthRevenue)} icon={<TrendingUp className="w-5 h-5 text-white" />} color="bg-blue-600" />
        <StatCard title="Active Sites" value={String(activeSites.length)} icon={<MapPin className="w-5 h-5 text-white" />} color="bg-purple-600" />
        <StatCard title="Total Inventory" value={String(totalRemaining)} sub="vouchers remaining" icon={<Boxes className="w-5 h-5 text-white" />} color="bg-orange-600" />
        <StatCard title="Month Vouchers" value={String(monthVouchers)} sub="sold this month" icon={<ShoppingCart className="w-5 h-5 text-white" />} color="bg-pink-600" />
      </div>

      {/* Site cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Site Performance</h2>
        {activeSites.length === 0 ? (
          <div className="text-slate-500 text-sm py-8 text-center">No active sites yet. <Link href="/dashboard/sites" className="text-blue-400 underline">Add a site</Link></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSites.map(site => (
              <div key={site.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-white">{site.name}</p>
                    <p className="text-slate-400 text-xs">{site.location}</p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Month Revenue</p>
                    <p className="text-white font-medium">{formatCurrency(siteRevMap[site.id] || 0)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Inventory</p>
                    <p className={`font-medium ${(siteInvMap[site.id] || 0) < 10 ? "text-red-400" : "text-white"}`}>
                      {siteInvMap[site.id] || 0} vouchers
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Recent Sales</h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {(recentSales || []).length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">No sales recorded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Site</th>
                  <th className="px-4 py-3 text-right">500 TSH</th>
                  <th className="px-4 py-3 text-right">1000 TSH</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(recentSales || []).map((s: any) => (
                  <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 text-slate-300">{formatDate(s.date)}</td>
                    <td className="px-4 py-3 text-white font-medium">{s.sites?.name}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{s.used_500}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{s.used_1000}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-medium">{formatCurrency(s.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
