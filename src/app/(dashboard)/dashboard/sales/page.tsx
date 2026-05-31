"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner, EmptyState } from "@/components/ui/States";
import { formatDate, formatCurrency, todayISO } from "@/lib/utils";
import { Plus, Calculator, Trash2, Pencil } from "lucide-react";
import type { Site, DailySale } from "@/lib/types";

const emptyForm = { site_id: "", date: todayISO(), used_500: "0", used_1000: "0", notes: "" };

export default function SalesPage() {
  const [sales, setSales] = useState<DailySale[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const supabase = createClient();
  const preview500 = parseInt(form.used_500 || "0") * 500;
  const preview1000 = parseInt(form.used_1000 || "0") * 1000;

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: s }, { data: si }] = await Promise.all([
      supabase.from("daily_sales").select("*,sites(name)").eq("user_id", user!.id).order("date", { ascending: false }).limit(100),
      supabase.from("sites").select("*").eq("user_id", user!.id).eq("status", "active"),
    ]);
    setSales(s || []);
    setSites(si || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEdit(s: any) {
    setEditingId(s.id);
    setForm({ site_id: s.site_id, date: s.date, used_500: String(s.used_500), used_1000: String(s.used_1000), notes: s.notes || "" });
    setSaveError("");
    setShowForm(true);
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setSaveError("");
    setShowForm(true);
  }

  async function save() {
    if (!form.site_id || !form.date) return;
    setSaving(true);
    setSaveError("");
    const res = await fetch("/api/sales", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        site_id: form.site_id,
        date: form.date,
        used_500: parseInt(form.used_500 || "0"),
        used_1000: parseInt(form.used_1000 || "0"),
        notes: form.notes,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      load();
    } else {
      setSaveError(json.error || "Failed to save");
    }
  }

  async function deleteSale(id: string) {
    await fetch("/api/sales", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConfirmDelete(null);
    load();
  }

  const filtered = filterSite ? sales.filter((s: any) => s.site_id === filterSite) : sales;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Sales</h1>
          <p className="text-slate-400 text-sm">Record daily voucher usage</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Record Sales
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">{editingId ? "Edit Sale" : "Record Daily Sales"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Site *</label>
                <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Used 500 TSH Vouchers</label>
                <input type="number" min="0" value={form.used_500} onChange={e => setForm(f => ({ ...f, used_500: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Used 1000 TSH Vouchers</label>
                <input type="number" min="0" value={form.used_1000} onChange={e => setForm(f => ({ ...f, used_1000: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-slate-300 font-medium">Revenue Preview</span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between"><span>500 TSH × {form.used_500 || 0}</span><span className="text-white">{formatCurrency(preview500)}</span></div>
                  <div className="flex justify-between"><span>1000 TSH × {form.used_1000 || 0}</span><span className="text-white">{formatCurrency(preview1000)}</span></div>
                  <div className="flex justify-between border-t border-slate-600 pt-1 font-medium text-sm">
                    <span className="text-slate-300">Total</span>
                    <span className="text-green-400">{formatCurrency(preview500 + preview1000)}</span>
                  </div>
                </div>
              </div>
            </div>
            {saveError && <div className="mt-3 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">{saveError}</div>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowForm(false); setSaveError(""); }} className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition">Cancel</button>
              <button onClick={save} disabled={saving || !form.site_id || !form.date}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Update" : "Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Sale Record?</h2>
            <p className="text-slate-400 text-sm mb-5">Vouchers will be restored to inventory. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition">Cancel</button>
              <button onClick={() => deleteSale(confirmDelete)} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No sales recorded yet." /> : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Site</th>
                <th className="px-4 py-3 text-right">500</th>
                <th className="px-4 py-3 text-right">1000</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => (
                <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                  <td className="px-4 py-3 text-slate-300">{formatDate(s.date)}</td>
                  <td className="px-4 py-3 text-white font-medium">{s.sites?.name}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{s.used_500}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{s.used_1000}</td>
                  <td className="px-4 py-3 text-right text-green-400 font-medium">{formatCurrency(s.total_revenue)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{s.notes || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-900/40 text-red-400 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
