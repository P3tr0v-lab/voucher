export type VoucherType = "500" | "1000";
export type SiteStatus = "active" | "inactive";

export interface Site {
  id: string;
  name: string;
  location: string;
  description: string | null;
  status: SiteStatus;
  created_at: string;
  user_id: string;
}

export interface VoucherBatch {
  id: string;
  site_id: string;
  batch_name: string;
  voucher_type: VoucherType;
  quantity_received: number;
  quantity_remaining: number;
  purchase_date: string;
  notes: string | null;
  is_exhausted: boolean;
  created_at: string;
  user_id: string;
}

export interface DailySale {
  id: string;
  site_id: string;
  date: string;
  used_500: number;
  used_1000: number;
  revenue_500: number;
  revenue_1000: number;
  total_revenue: number;
  notes: string | null;
  created_at: string;
  user_id: string;
  sites?: Site;
}

export interface BatchConsumption {
  id: string;
  daily_sale_id: string;
  batch_id: string;
  voucher_type: VoucherType;
  quantity_consumed: number;
  created_at: string;
}

export interface Expense {
  id: string;
  site_id: string | null;
  month: number;
  year: number;
  internet_cost: number;
  electricity: number;
  rent: number;
  maintenance: number;
  other: number;
  notes: string | null;
  created_at: string;
  user_id: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "low_stock" | "exhausted_batch" | "no_sales" | "new_batch";
  message: string;
  site_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  todayRevenue: number;
  monthRevenue: number;
  activeSites: number;
  totalRemaining: number;
  monthVouchersSold: number;
}

export interface SiteSummary extends Site {
  monthRevenue: number;
  remaining500: number;
  remaining1000: number;
  monthSales: number;
}
