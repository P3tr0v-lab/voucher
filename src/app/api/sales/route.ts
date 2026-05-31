import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { site_id, date, used_500, used_1000, notes } = await req.json();

  if (!site_id || !date) return NextResponse.json({ error: "site_id and date are required" }, { status: 400 });
  const qty500 = Math.max(0, parseInt(used_500) || 0);
  const qty1000 = Math.max(0, parseInt(used_1000) || 0);
  if (qty500 === 0 && qty1000 === 0) return NextResponse.json({ error: "At least one voucher type must be greater than 0" }, { status: 400 });

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
    .select().single();

  if (saleErr) return NextResponse.json({ error: saleErr.message }, { status: 400 });

  if (qty500 > 0) await fifoDeduct(supabase, user.id, site_id, "500", qty500, sale.id);
  if (qty1000 > 0) await fifoDeduct(supabase, user.id, site_id, "1000", qty1000, sale.id);

  await checkAndNotify(supabase, user.id, site_id);

  return NextResponse.json({ success: true, sale });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, site_id, date, used_500, used_1000, notes } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const qty500 = Math.max(0, parseInt(used_500) || 0);
  const qty1000 = Math.max(0, parseInt(used_1000) || 0);
  if (qty500 === 0 && qty1000 === 0) return NextResponse.json({ error: "At least one voucher type must be greater than 0" }, { status: 400 });

  // Get original sale to calculate diff
  const { data: orig } = await supabase.from("daily_sales").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!orig) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

  const diff500 = qty500 - orig.used_500;
  const diff1000 = qty1000 - orig.used_1000;

  // Check stock for increases
  if (diff500 > 0) {
    const avail = await getAvailableStock(supabase, user.id, site_id, "500");
    if (avail < diff500) return NextResponse.json({ error: `Not enough 500 TSH vouchers. Available: ${avail}, need ${diff500} more` }, { status: 400 });
  }
  if (diff1000 > 0) {
    const avail = await getAvailableStock(supabase, user.id, site_id, "1000");
    if (avail < diff1000) return NextResponse.json({ error: `Not enough 1000 TSH vouchers. Available: ${avail}, need ${diff1000} more` }, { status: 400 });
  }

  // Restore stock for decreases
  if (diff500 < 0) await restoreStock(supabase, id, "500", Math.abs(diff500));
  if (diff1000 < 0) await restoreStock(supabase, id, "1000", Math.abs(diff1000));

  // Deduct for increases
  if (diff500 > 0) await fifoDeduct(supabase, user.id, site_id, "500", diff500, id);
  if (diff1000 > 0) await fifoDeduct(supabase, user.id, site_id, "1000", diff1000, id);

  const revenue_500 = qty500 * 500;
  const revenue_1000 = qty1000 * 1000;
  const total_revenue = revenue_500 + revenue_1000;

  await supabase.from("daily_sales").update({ date, used_500: qty500, used_1000: qty1000, revenue_500, revenue_1000, total_revenue, notes: notes || null })
    .eq("id", id).eq("user_id", user.id);

  await checkAndNotify(supabase, user.id, site_id);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: sale } = await supabase.from("daily_sales").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

  // Restore inventory from batch_consumption records
  await restoreStock(supabase, id, "500", sale.used_500);
  await restoreStock(supabase, id, "1000", sale.used_1000);

  await supabase.from("daily_sales").delete().eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}

async function restoreStock(supabase: any, saleId: string, voucherType: string, qty: number) {
  if (qty <= 0) return;
  const { data: consumptions } = await supabase
    .from("batch_consumption")
    .select("*")
    .eq("daily_sale_id", saleId)
    .eq("voucher_type", voucherType);

  for (const c of (consumptions || [])) {
    const { data: batch } = await supabase.from("voucher_batches").select("quantity_remaining,quantity_received").eq("id", c.batch_id).single();
    if (!batch) continue;
    const newQty = Math.min(batch.quantity_remaining + c.quantity_consumed, batch.quantity_received);
    await supabase.from("voucher_batches").update({ quantity_remaining: newQty, is_exhausted: false }).eq("id", c.batch_id);
  }
  await supabase.from("batch_consumption").delete().eq("daily_sale_id", saleId).eq("voucher_type", voucherType);
}

async function getAvailableStock(supabase: any, userId: string, siteId: string, voucherType: string): Promise<number> {
  const { data } = await supabase.from("voucher_batches").select("quantity_remaining")
    .eq("user_id", userId).eq("site_id", siteId).eq("voucher_type", voucherType).eq("is_exhausted", false);
  return (data || []).reduce((s: number, b: any) => s + b.quantity_remaining, 0);
}

async function fifoDeduct(supabase: any, userId: string, siteId: string, voucherType: string, qty: number, saleId: string) {
  const { data: batches } = await supabase.from("voucher_batches").select("*")
    .eq("user_id", userId).eq("site_id", siteId).eq("voucher_type", voucherType).eq("is_exhausted", false)
    .order("purchase_date", { ascending: true }).order("created_at", { ascending: true });

  let remaining = qty;
  for (const batch of (batches || [])) {
    if (remaining <= 0) break;
    const consume = Math.min(batch.quantity_remaining, remaining);
    const newQty = batch.quantity_remaining - consume;
    await supabase.from("voucher_batches").update({ quantity_remaining: newQty, is_exhausted: newQty === 0 }).eq("id", batch.id);
    await supabase.from("batch_consumption").insert({ daily_sale_id: saleId, batch_id: batch.id, voucher_type: voucherType, quantity_consumed: consume });
    remaining -= consume;
  }
}

async function checkAndNotify(supabase: any, userId: string, siteId: string) {
  const { data: batches } = await supabase.from("voucher_batches").select("*")
    .eq("user_id", userId).eq("site_id", siteId).eq("is_exhausted", false);

  for (const batch of (batches || [])) {
    if (batch.quantity_remaining === 0) {
      await supabase.from("notifications").insert({
        user_id: userId, type: "exhausted_batch", site_id: siteId,
        message: `Batch "${batch.batch_name}" is now exhausted.`,
      });
    } else if (batch.quantity_remaining <= 10) {
      // Only notify if not already notified recently
      const { data: existing } = await supabase.from("notifications")
        .select("id").eq("user_id", userId).eq("type", "low_stock")
        .eq("is_read", false).ilike("message", `%${batch.batch_name}%`).limit(1);
      if (!existing?.length) {
        await supabase.from("notifications").insert({
          user_id: userId, type: "low_stock", site_id: siteId,
          message: `Batch "${batch.batch_name}" is low on stock (${batch.quantity_remaining} remaining).`,
        });
      }
    }
  }
}
