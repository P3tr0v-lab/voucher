"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/States";
import { formatCurrency, currentMonth } from "@/lib/utils";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Site } from "@/lib/types";

const expenseFields = [
  { label: "Internet Package (TSH)", key: "internet_cost" },
  { label: "Electricity (TSH)", key: "electricity" },
  { label: "Rent (TSH)", key: "rent" },
  { label: "Maintenance (TSH)", key: "maintenance" },
  { label: "Other (TSH)", key: "other" },
];

const emptyForm = { month: "", year: "", site_id: "", internet_cost: "0", electricity: "0", rent: "0", maintenance: "0", other: "0", notes: "" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { month, year } = currentMonth();
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [form, setForm] = useState({ ...emptyForm, month: String(month), year: String(year) });

  const supabase = createClient();

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: e }, { data: s }, { data: si }] = await Promise.all([
      supabase.from("expenses").select("*").eq("user_id", user!.id).order("year", { ascending: false }).order("month", { ascending: false }),
      supabase.from("daily_sales").select("total_revenue,date,site_id").eq("user_id", user!.id),
      supabase.from("sites").select("*").eq("user_id", user!.id).eq("status", "active"),
    ]);
    setExpenses(e || []);
    setSales(s || []);
    setSites(si || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, month: String(month), year: String(year) });
    setShowForm(true);
  }

  function openEdit(e: any) {
    setEditingId(e.id);
    setForm({
      month: String(e.month), year: String(e.year), site_id: e.site_id || "",
      internet_cost: String(e.internet_cost), electricity: String(e.electricity),
      rent: String(e.rent), maintenance: String(e.maintenance), other: String(e.other),
      notes: e.notes || "",
    });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      month: parseInt(form.month), year: parseInt(form.year),
      site_id: form.site_id || null,
      internet_cost: parseFloat(form.internet_cost) || 0,
      electricity: parseFloat(form.electricity) || 0,
      rent: parseFloat(form.rent) || 0,
      maintenance: parseFloat(form.maintenance) || 0,
      other: parseFloat(form.other) || 0,
      notes: form.notes || null,
      user_id: user!.id,
    };
    if (editingId) {
      await supabase.from("expenses").update(payload).eq("id", editingId);
    } else {
      await supabase.from("expenses").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    load();
  }

  async function deleteExpense(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    setConfirmDelete(null);
    load();
  }

  const filteredExp = expenses.filter(e =>
    (!filterMonth || e.month === parseInt(filterMonth)) &&
    (!filterYear || e.year === parseInt(filterYear)) &&
    (!filterSite || e.site_id === filterSite)
  );
  const totalExpenses = filteredExp.reduce((s, e) => s + e.internet_cost + e.electricity + e.rent + e.maintenance + e.other, 0);

  const periodSales = sales.filter(s => {
    const inYear = !filterYear || s.date.startsWith(filterYear);
    const inMonth = !filterMonth || s.date.slice(5, 7) === String(filterMonth).padStart(2, "0");
    const inSite = !filterSite || s.site_id === filterSite;
    return inYear && inMonth && inSite;
  });
  const grossRevenue = periodSales.reduce((s, r) => s + r.total_revenue, 0);
  const netProfit = grossRevenue - totalExpenses;

  // Per-site profit breakdown
  const siteBreakdown = sites.map(site => {
    const siteExp = expenses.filter(e =>
      (!filterMonth || e.month === parseInt(filterMonth)) &&
      (!filterYear || e.year === parseInt(filterYear)) &&
      e.site_id === site.id
    );
    const siteSales = sales.filter(s => {
      const inYear = !filterYear || s.date.startsWith(filterYear);
      const inMonth = !filterMonth || s.date.slice(5, 7) === String(filterMonth).padStart(2, "0");
      return inYear && inMonth && s.site_id === site.id;
    });
    const rev = siteSales.reduce((s, r) => s + r.total_revenue, 0);
    const exp = siteExp.reduce((s, e) => s + e.internet_cost + e.electricity + e.rent + e.maintenance + e.other, 0);
    return { site, rev, exp, profit: rev - exp };
  }).filter(s => s.rev > 0 || s.exp > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses & Profit</h1>
          <p className="text-slate-400 text-sm">Track monthly costs and net profit</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Add Expenses
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">{editingId ? "Edit Expenses" : "Add Monthly Expenses"}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Month</label>
                  <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "long" })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Year</label>
                  <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Site (optional)</label>
                <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none">
                  <option value="">All Sites / General</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {expenseFields.map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm text-slate-300 mb-1">{label}</label>
                  <input type="number" min="0" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Expense?</h2>
            <p className="text-slate-400 text-sm mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition">Cancel</button>
              <button onClick={() => deleteExpense(confirmDelete)} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none">
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Gross Revenue</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(grossRevenue)}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Total Expenses</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className={`rounded-xl p-5 border ${netProfit >= 0 ? "bg-green-900/30 border-green-700" : "bg-red-900/30 border-red-700"}`}>
              <p className="text-slate-400 text-xs uppercase tracking-wide">Net Profit</p>
              <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(netProfit)}</p>
            </div>
          </div>

          {/* Per-site profit breakdown */}
          {!filterSite && siteBreakdown.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-white mb-3">Profit by Site</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {siteBreakdown.map(({ site, rev, exp, profit }) => (
                  <div key={site.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <p className="text-white font-medium text-sm mb-2">{site.name}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">Revenue</span><span className="text-white">{formatCurrency(rev)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Expenses</span><span className="text-red-400">{formatCurrency(exp)}</span></div>
                      <div className="flex justify-between border-t border-slate-700 pt-1 font-medium text-sm">
                        <span className="text-slate-300">Profit</span>
                        <span className={profit >= 0 ? "text-green-400" : "text-red-400"}>{formatCurrency(profit)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense records */}
          {filteredExp.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                    <th className="px-4 py-3 text-left">Site</th>
                    <th className="px-4 py-3 text-right">Internet</th>
                    <th className="px-4 py-3 text-right">Electricity</th>
                    <th className="px-4 py-3 text-right">Rent</th>
                    <th className="px-4 py-3 text-right">Maintenance</th>
                    <th className="px-4 py-3 text-right">Other</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExp.map(e => (
                    <tr key={e.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3 text-slate-300 text-xs">{sites.find(s => s.id === e.site_id)?.name || "General"}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(e.internet_cost)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(e.electricity)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(e.rent)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(e.maintenance)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(e.other)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{e.notes || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 transition"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-900/40 text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
