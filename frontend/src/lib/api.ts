const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://bizzy-engine.onrender.com/api/v1";

// Response Types
interface OTPVerifyResponse {
  access_token: string;
}

interface OTPResponse {
  message: string;
  expires_in?: number;
}

interface Product {
  id: number;
  name: string;
  variant: string;
  price: number;
  min_floor_price: number;
  stock_quantity: number;
  merchant_id: number;
  is_available?: boolean; 
  created_at?: string;
  updated_at?: string;
}

interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Order {
  id: number;
  merchant_id: number;
  customer_number: string;
  order_reference: string;
  items_ordered: OrderItem[];
  total_amount: number;
  order_status: string;
  payment_status: string;
  delivery_address?: string;
  created_at: string;
  confirmed_at?: string;
}

interface BargainLog {
  id: number;
  merchant_id: number;
  customer_number: string;
  product_id: number;
  original_price: number;
  final_price: number;
  discount_percentage: number;
  discount_amount: number;
  outcome: string;
  created_at: string;
}

interface Merchant {
  id: number;
  business_name: string;
  bizzy_number: string;
  owner_personal_number: string;
  payment_details: string;
  is_active: boolean;
  created_at?: string;
}

interface AnalyticsOverview {
  total_revenue: number;
  total_orders: number;
  total_products: number;
  total_bargains: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  order_count: number;
}

interface RevenueData {
  period: string;
  revenue: number;
  order_count: number;
}

async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("bizzy_token") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const sendOTP = (phone: string) =>
  fetcher<OTPResponse>("/auth/otp/send", { method: "POST", body: JSON.stringify({ whatsapp_number: phone }) });

export const verifyOTP = (phone: string, otp: string) =>
  fetcher<OTPVerifyResponse>("/auth/otp/verify", { method: "POST", body: JSON.stringify({ whatsapp_number: phone, otp }) });

// Analytics
export const getDailyRevenue = () => fetcher<DailyRevenue[]>("/analytics/revenue/daily");
export const getAnalyticsOverview = () => fetcher<AnalyticsOverview>("/analytics/overview");
export const getAnalyticsPerformance = () => fetcher<any>("/analytics/performance");
export const getRevenue = (period: "day" | "week" | "month") =>
  fetcher<RevenueData>(`/analytics/revenue?period=${period}`);

// Products
export const getProducts = () => fetcher<Product[]>("/products");
export const createProduct = (data: Partial<Product>) => fetcher<Product>("/products", { method: "POST", body: JSON.stringify(data) });
export const updateProduct = (id: number, data: Partial<Product>) =>
  fetcher<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProduct = (id: number) => fetcher<void>(`/products/${id}`, { method: "DELETE" });

// Orders
export const getOrders = () => fetcher<Order[]>("/orders");
export const updateOrderStatus = (id: number, data: { order_status: string }) =>
  fetcher<Order>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify(data) });

// Bargains
export const getBargains = () => fetcher<BargainLog[]>("/bargains");

// Merchant
export const getMerchant = () => fetcher<Merchant>("/merchant");
export const updateMerchant = (data: Partial<Merchant>) =>
  fetcher<Merchant>("/merchant", { method: "PUT", body: JSON.stringify(data) });