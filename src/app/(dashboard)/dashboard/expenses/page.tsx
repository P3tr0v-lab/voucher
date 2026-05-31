"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/States";
import { formatCurrency, currentMonth } from "@/lib/utils";
import { Plus } from "lucide-react";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { month, year } = currentMonth();
  const [filterMonth, setFilterMonth] = useState(String(month));
  const [filterYear, setFilterYear] = useState(String(year));
  const [form, setForm] = useState({ month: String(month), year: String(year), internet_cost: "0", electricity: "0", rent: "0", maintenance: "0", other: "0", notes: "" });

  const supabase = createClient();

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: e }, { data: s }] = await Promise.all([
      supabase.from("expenses").select("*").eq("user_id", user!.id).order("year", { ascending: false }).order("month", { ascending: false }),
      supabase.from("daily_sales").select("total_revenue,date").eq("user_id", user!.id),
    ]);
    setExpenses(e || []);
    setSales(s || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("expenses").insert({
      month: parseInt(form.month), year: parseInt(form.year),
      internet_cost: parseFloat(form.internet_cost) || 0,
      electricity: parseFloat(form.electricity) || 0,
      rent: parseFloat(form.rent) || 0,
      maintenance: parseFloat(form.maintenance) || 0,
      other: parseFloat(form.other) || 0,
      notes: form.notes || null,
      user_id: user!.id,
    });
    setSaving(false);
    setShowForm(false);
    load();
  }

  const filteredExp = expenses.filter(e => e.month === parseInt(filterMonth) && e.year === parseInt(filterYear));
  const totalExpenses = filteredExp.reduce((s, e) => s + e.internet_cost + e.electricity + e.rent + e.maintenance + e.other, 0);

  const mStart = `${filterYear}-${String(filterMonth).padStart(2, "0")}-01`;
  const mEnd = `${filterYear}-${String(filterMonth).padStart(2, "0")}-31`;
  const grossRevenue = sales.filter(s => s.date >= mStart && s.date <= mEnd).reduce((s, r) => s + r.total_revenue, 0);
  const netProfit = grossRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses & Profit</h1>
          <p className="text-slate-400 text-sm">Track monthly costs and net profit</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Add Expenses
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Add Monthly Expenses</h2>
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
              {[
                { label: "Internet Package (TSH)", key: "internet_cost" },
                { label: "Electricity (TSH)", key: "electricity" },
                { label: "Rent (TSH)", key: "rent" },
                { label: "Maintenance (TSH)", key: "maintenance" },
                { label: "Other (TSH)", key: "other" },
              ].map(({ label, key }) => (
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

      {/* Filter */}
      <div className="flex gap-3">
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "long" })}</option>
          ))}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Profit summary */}
          <div className="grid grid-cols-3 gap-4">
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

          {/* Expense breakdown */}
          {filteredExp.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                    <th className="px-4 py-3 text-left">Internet</th>
                    <th className="px-4 py-3 text-left">Electricity</th>
                    <th className="px-4 py-3 text-left">Rent</th>
                    <th className="px-4 py-3 text-left">Maintenance</th>
                    <th className="px-4 py-3 text-left">Other</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExp.map(e => (
                    <tr key={e.id} className="border-b border-slate-700/50">
                      <td className="px-4 py-3 text-white">{formatCurrency(e.internet_cost)}</td>
                      <td className="px-4 py-3 text-white">{formatCurrency(e.electricity)}</td>
                      <td className="px-4 py-3 text-white">{formatCurrency(e.rent)}</td>
                      <td className="px-4 py-3 text-white">{formatCurrency(e.maintenance)}</td>
                      <td className="px-4 py-3 text-white">{formatCurrency(e.other)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{e.notes || "-"}</td>
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
