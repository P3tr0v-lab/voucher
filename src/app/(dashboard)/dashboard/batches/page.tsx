"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Spinner, EmptyState } from "@/components/ui/States";
import { formatDate, formatCurrency, todayISO } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { Site, VoucherBatch } from "@/lib/types";

export default function BatchesPage() {
  const [batches, setBatches] = useState<(VoucherBatch & { sites: Site })[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    site_id: "", batch_name: "", voucher_type: "500",
    quantity_received: "", purchase_date: todayISO(), notes: ""
  });

  const supabase = createClient();

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: b }, { data: s }] = await Promise.all([
      supabase.from("voucher_batches").select("*,sites(*)").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("sites").select("*").eq("user_id", user!.id).eq("status", "active"),
    ]);
    setBatches(b || []);
    setSites(s || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.site_id || !form.batch_name || !form.quantity_received) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const qty = parseInt(form.quantity_received);
    await supabase.from("voucher_batches").insert({
      site_id: form.site_id,
      batch_name: form.batch_name,
      voucher_type: form.voucher_type,
      quantity_received: qty,
      quantity_remaining: qty,
      purchase_date: form.purchase_date,
      notes: form.notes || null,
      is_exhausted: false,
      user_id: user!.id,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ site_id: "", batch_name: "", voucher_type: "500", quantity_received: "", purchase_date: todayISO(), notes: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Voucher Batches</h1>
          <p className="text-slate-400 text-sm">Manage stock batches per site</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Add Batch
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Add Voucher Batch</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Site</label>
                <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Batch Name</label>
                <input value={form.batch_name} onChange={e => setForm(f => ({ ...f, batch_name: e.target.value }))}
                  placeholder="e.g. June Batch 1"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Voucher Type</label>
                <select value={form.voucher_type} onChange={e => setForm(f => ({ ...f, voucher_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="500">500 TSH (6 Hours)</option>
                  <option value="1000">1000 TSH (24 Hours)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Quantity</label>
                <input type="number" min="1" value={form.quantity_received} onChange={e => setForm(f => ({ ...f, quantity_received: e.target.value }))}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Purchase Date</label>
                <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition">Cancel</button>
              <button onClick={save} disabled={saving || !form.site_id || !form.batch_name || !form.quantity_received}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50">
                {saving ? "Saving..." : "Add Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : batches.length === 0 ? <EmptyState message="No batches yet. Add your first batch." /> : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Batch</th>
                <th className="px-4 py-3 text-left">Site</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Received</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                  <td className="px-4 py-3 text-white font-medium">{b.batch_name}</td>
                  <td className="px-4 py-3 text-slate-300">{(b as any).sites?.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.voucher_type === "500" ? "default" : "success"}>{b.voucher_type} TSH</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{b.quantity_received}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={b.quantity_remaining < 10 ? "text-red-400 font-medium" : "text-white"}>{b.quantity_remaining}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(b.purchase_date)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.is_exhausted ? "danger" : b.quantity_remaining < 10 ? "warning" : "success"}>
                      {b.is_exhausted ? "Exhausted" : b.quantity_remaining < 10 ? "Low Stock" : "Active"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
