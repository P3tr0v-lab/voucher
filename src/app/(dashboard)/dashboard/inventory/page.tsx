import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const [{ data: sites }, { data: batches }] = await Promise.all([
    supabase.from("sites").select("*").eq("user_id", uid).eq("status", "active"),
    supabase.from("voucher_batches").select("*").eq("user_id", uid),
  ]);

  const siteStats = (sites || []).map(site => {
    const sb = (batches || []).filter(b => b.site_id === site.id);
    const total500 = sb.filter(b => b.voucher_type === "500").reduce((s, b) => s + b.quantity_received, 0);
    const total1000 = sb.filter(b => b.voucher_type === "1000").reduce((s, b) => s + b.quantity_received, 0);
    const rem500 = sb.filter(b => b.voucher_type === "500" && !b.is_exhausted).reduce((s, b) => s + b.quantity_remaining, 0);
    const rem1000 = sb.filter(b => b.voucher_type === "1000" && !b.is_exhausted).reduce((s, b) => s + b.quantity_remaining, 0);
    const sold500 = total500 - rem500;
    const sold1000 = total1000 - rem1000;
    const activeBatches = sb.filter(b => !b.is_exhausted).length;
    const exhaustedBatches = sb.filter(b => b.is_exhausted).length;
    const invValue = rem500 * 500 + rem1000 * 1000;
    return { site, total500, total1000, rem500, rem1000, sold500, sold1000, activeBatches, exhaustedBatches, invValue };
  });

  const lowStockSites = siteStats.filter(s => s.rem500 < 10 || s.rem1000 < 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <p className="text-slate-400 text-sm">Stock levels across all sites</p>
      </div>

      {lowStockSites.length > 0 && (
        <div className="p-4 rounded-xl bg-yellow-900/30 border border-yellow-700 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-medium text-sm">Low Stock Warning</p>
            <p className="text-yellow-400/80 text-xs mt-0.5">
              {lowStockSites.map(s => `${s.site.name}: ${s.rem500 < 10 ? `${s.rem500} × 500TSH` : ""} ${s.rem1000 < 10 ? `${s.rem1000} × 1000TSH` : ""}`).join(" | ")}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {siteStats.length === 0 ? (
          <div className="text-center text-slate-500 py-12">No active sites found.</div>
        ) : siteStats.map(({ site, total500, total1000, rem500, rem1000, sold500, sold1000, activeBatches, exhaustedBatches, invValue }) => (
          <div key={site.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{site.name}</h2>
                <p className="text-slate-400 text-xs">{site.location}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Inventory Value</p>
                <p className="text-lg font-bold text-green-400">{formatCurrency(invValue)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: "500 TSH Received", value: total500 },
                { label: "500 TSH Remaining", value: rem500, warn: rem500 < 10 },
                { label: "1000 TSH Received", value: total1000 },
                { label: "1000 TSH Remaining", value: rem1000, warn: rem1000 < 10 },
              ].map(({ label, value, warn }) => (
                <div key={label} className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">{label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${warn ? "text-red-400" : "text-white"}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span>Sold 500: <strong className="text-white">{sold500}</strong></span>
              <span>Sold 1000: <strong className="text-white">{sold1000}</strong></span>
              <span>Active Batches: <strong className="text-green-400">{activeBatches}</strong></span>
              <span>Exhausted: <strong className="text-slate-500">{exhaustedBatches}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
