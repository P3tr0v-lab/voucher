import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { site_id, date, used_500, used_1000, notes } = await req.json();

  // Input validation
  if (!site_id || !date) return NextResponse.json({ error: "site_id and date are required" }, { status: 400 });
  const qty500 = Math.max(0, parseInt(used_500) || 0);
  const qty1000 = Math.max(0, parseInt(used_1000) || 0);
  if (qty500 === 0 && qty1000 === 0) return NextResponse.json({ error: "At least one voucher type must be greater than 0" }, { status: 400 });

  // Check available stock before recording
  if (qty500 > 0) {
    const avail = await getAvailableStock(supabase, user.id, site_id, "500");
    if (avail < qty500) return NextResponse.json({ error: `Not enough 500 TSH vouchers. Available: ${avail}, requested: ${qty500}` }, { status: 400 });
  }
  if (qty1000 > 0) {
    const avail = await getAvailableStock(supabase, user.id, site_id, "1000");
    if (avail < qty1000) return NextResponse.json({ error: `Not enough 1000 TSH vouchers. Available: ${avail}, requested: ${qty1000}` }, { status: 400 });
  }

  const revenue_500 = qty500 * 500;
  const revenue_1000 = qty1000 * 1000;
  const total_revenue = revenue_500 + revenue_1000;

  const { data: sale, error: saleErr } = await supabase
    .from("daily_sales")
    .insert({ site_id, date, used_500: qty500, used_1000: qty1000, revenue_500, revenue_1000, total_revenue, notes: notes || null, user_id: user.id })
    .select()
    .single();

  if (saleErr) return NextResponse.json({ error: saleErr.message }, { status: 400 });

  if (qty500 > 0) await fifoDeduct(supabase, user.id, site_id, "500", qty500, sale.id);
  if (qty1000 > 0) await fifoDeduct(supabase, user.id, site_id, "1000", qty1000, sale.id);

  return NextResponse.json({ success: true, sale });
}

async function getAvailableStock(supabase: any, userId: string, siteId: string, voucherType: string): Promise<number> {
  const { data } = await supabase
    .from("voucher_batches")
    .select("quantity_remaining")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .eq("voucher_type", voucherType)
    .eq("is_exhausted", false);
  return (data || []).reduce((s: number, b: any) => s + b.quantity_remaining, 0);
}

async function fifoDeduct(supabase: any, userId: string, siteId: string, voucherType: string, qty: number, saleId: string) {
  const { data: batches } = await supabase
    .from("voucher_batches")
    .select("*")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .eq("voucher_type", voucherType)
    .eq("is_exhausted", false)
    .order("purchase_date", { ascending: true })
    .order("created_at", { ascending: true });

  let remaining = qty;
  for (const batch of (batches || [])) {
    if (remaining <= 0) break;
    const consume = Math.min(batch.quantity_remaining, remaining);
    const newQty = batch.quantity_remaining - consume;
    await supabase.from("voucher_batches").update({
      quantity_remaining: newQty,
      is_exhausted: newQty === 0,
    }).eq("id", batch.id);
    await supabase.from("batch_consumption").insert({
      daily_sale_id: saleId,
      batch_id: batch.id,
      voucher_type: voucherType,
      quantity_consumed: consume,
    });
    remaining -= consume;
  }
}
