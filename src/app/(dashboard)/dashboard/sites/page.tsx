"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Spinner, EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, PowerOff } from "lucide-react";
import type { Site } from "@/lib/types";

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [form, setForm] = useState({ name: "", location: "", description: "" });
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("sites").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setSites(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setEditing(null); setForm({ name: "", location: "", description: "" }); setShowForm(true); }
  function openEdit(s: Site) { setEditing(s); setForm({ name: s.name, location: s.location, description: s.description || "" }); setShowForm(true); }

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (editing) {
      await supabase.from("sites").update({ name: form.name, location: form.location, description: form.description }).eq("id", editing.id);
    } else {
      await supabase.from("sites").insert({ ...form, status: "active", user_id: user!.id });
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function toggleStatus(site: Site) {
    await supabase.from("sites").update({ status: site.status === "active" ? "inactive" : "active" }).eq("id", site.id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sites</h1>
          <p className="text-slate-400 text-sm">Manage your hotspot locations</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Add Site
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">{editing ? "Edit Site" : "Add Site"}</h2>
            <div className="space-y-3">
              {[
                { label: "Site Name", key: "name", placeholder: "e.g. Mbezi Site" },
                { label: "Location", key: "location", placeholder: "e.g. Mbezi Beach" },
                { label: "Description", key: "description", placeholder: "Optional notes" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm text-slate-300 mb-1">{label}</label>
                  <input
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition">Cancel</button>
              <button onClick={save} disabled={saving || !form.name || !form.location} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : sites.length === 0 ? <EmptyState message="No sites yet. Add your first site." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map(site => (
            <div key={site.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-white">{site.name}</p>
                  <p className="text-slate-400 text-xs">{site.location}</p>
                </div>
                <Badge variant={site.status === "active" ? "success" : "warning"}>
                  {site.status}
                </Badge>
              </div>
              {site.description && <p className="text-slate-500 text-xs mb-3">{site.description}</p>}
              <p className="text-slate-600 text-xs mb-4">Created {formatDate(site.created_at)}</p>
              <div className="flex gap-2">
                <button onClick={() => openEdit(site)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => toggleStatus(site)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition">
                  <PowerOff className="w-3 h-3" /> {site.status === "active" ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
