"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download, Upload, Database } from "lucide-react";

export default function BackupPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState("");

  const supabase = createClient();

  async function exportBackup() {
    setExporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user!.id;

    const [{ data: sites }, { data: batches }, { data: sales }, { data: consumption }, { data: expenses }] = await Promise.all([
      supabase.from("sites").select("*").eq("user_id", uid),
      supabase.from("voucher_batches").select("*").eq("user_id", uid),
      supabase.from("daily_sales").select("*").eq("user_id", uid),
      supabase.from("batch_consumption").select("*").in(
        "daily_sale_id",
        (await supabase.from("daily_sales").select("id").eq("user_id", uid)).data?.map((s: any) => s.id) || []
      ),
      supabase.from("expenses").select("*").eq("user_id", uid),
    ]);

    const backup = { exported_at: new Date().toISOString(), sites, batches, sales, consumption, expenses };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hotspot-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setExporting(false);
    setMsg("Backup exported successfully.");
  }

  async function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMsg("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user!.id;

      if (data.sites) {
        for (const s of data.sites) {
          await supabase.from("sites").upsert({ ...s, user_id: uid });
        }
      }
      if (data.batches) {
        for (const b of data.batches) {
          await supabase.from("voucher_batches").upsert({ ...b, user_id: uid });
        }
      }
      if (data.sales) {
        for (const s of data.sales) {
          await supabase.from("daily_sales").upsert({ ...s, user_id: uid });
        }
      }
      if (data.expenses) {
        for (const ex of data.expenses) {
          await supabase.from("expenses").upsert({ ...ex, user_id: uid });
        }
      }
      setMsg("Backup imported successfully. Refresh the page.");
    } catch {
      setMsg("Error: Invalid backup file.");
    }
    setImporting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Backup & Restore</h1>
        <p className="text-slate-400 text-sm">Export or import your data</p>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl border text-sm ${msg.startsWith("Error") ? "bg-red-900/30 border-red-700 text-red-300" : "bg-green-900/30 border-green-700 text-green-300"}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-600"><Download className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-base font-semibold text-white">Export Backup</h2>
              <p className="text-slate-400 text-xs">Download all data as JSON</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-4">Exports sites, batches, sales, consumption history, and expenses.</p>
          <button onClick={exportBackup} disabled={exporting}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2">
            <Database className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export JSON Backup"}
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-600"><Upload className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-base font-semibold text-white">Import Backup</h2>
              <p className="text-slate-400 text-xs">Restore from a JSON backup file</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-4">Existing records with the same ID will be updated. New records will be added.</p>
          <label className={`w-full py-2.5 rounded-lg border-2 border-dashed border-slate-600 hover:border-green-500 text-slate-400 hover:text-green-400 text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload className="w-4 h-4" />
            {importing ? "Importing..." : "Choose JSON File"}
            <input type="file" accept=".json" onChange={importBackup} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}
