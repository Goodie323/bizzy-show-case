const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://bizzy-engine.onrender.com/api/v1";

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
  fetcher("/auth/otp/send", { method: "POST", body: JSON.stringify({ whatsapp_number: phone }) });

export const verifyOTP = (phone: string, otp: string) =>
  fetcher("/auth/otp/verify", { method: "POST", body: JSON.stringify({ whatsapp_number: phone, otp }) });

// Analytics
export const getDailyRevenue = () => fetcher<any>("/analytics/revenue/daily");
export const getAnalyticsOverview = () => fetcher<any>("/analytics/overview");
export const getAnalyticsPerformance = () => fetcher<any>("/analytics/performance");
export const getRevenue = (period: "day" | "week" | "month") =>
  fetcher<any>(`/analytics/revenue?period=${period}`);

// Products
export const getProducts = () => fetcher<any>("/products");
export const createProduct = (data: any) => fetcher<any>("/products", { method: "POST", body: JSON.stringify(data) });
export const updateProduct = (id: number, data: any) =>
  fetcher<any>(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProduct = (id: number) => fetcher<any>(`/products/${id}`, { method: "DELETE" });

// Orders
export const getOrders = () => fetcher<any>("/orders");
export const updateOrderStatus = (id: number, data: any) =>
  fetcher<any>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify(data) });

// Bargains
export const getBargains = () => fetcher<any>("/bargains");

// Merchant
export const getMerchant = () => fetcher<any>("/merchant");
export const updateMerchant = (data: any) =>
  fetcher<any>("/merchant", { method: "PUT", body: JSON.stringify(data) });
