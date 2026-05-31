import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { site_id, date, used_500, used_1000, notes } = await req.json();

  const revenue_500 = used_500 * 500;
  const revenue_1000 = used_1000 * 1000;
  const total_revenue = revenue_500 + revenue_1000;

  // Insert daily sale
  const { data: sale, error: saleErr } = await supabase
    .from("daily_sales")
    .insert({ site_id, date, used_500, used_1000, revenue_500, revenue_1000, total_revenue, notes: notes || null, user_id: user.id })
    .select()
    .single();

  if (saleErr) return NextResponse.json({ error: saleErr.message }, { status: 400 });

  // FIFO deduction for 500 TSH
  if (used_500 > 0) await fifoDeduct(supabase, user.id, site_id, "500", used_500, sale.id);
  // FIFO deduction for 1000 TSH
  if (used_1000 > 0) await fifoDeduct(supabase, user.id, site_id, "1000", used_1000, sale.id);

  return NextResponse.json({ success: true, sale });
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
