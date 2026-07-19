"use client";

import { Order } from "@/lib/api";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date;
  avatar?: string;
  status: "active" | "inactive" | "vip";
}

export const extractCustomersFromOrders = (orders: any[]): Customer[] => {
  const customerMap = new Map<string, Customer>();

  orders.forEach((order) => {
    const email = order.customerEmail || order.email || "unknown@email.com";
    const name = order.customerName || order.name || "Unknown Customer";
    const key = email.toLowerCase();

    if (customerMap.has(key)) {
      const existing = customerMap.get(key)!;
      existing.totalOrders += 1;
      existing.totalSpent += order.total || order.amount || 0;
      const orderDate = new Date(order.date || order.createdAt || Date.now());
      if (orderDate > existing.lastOrderDate) {
        existing.lastOrderDate = orderDate;
      }
    } else {
      customerMap.set(key, {
        id: key,
        name,
        email,
        phone: order.phone,
        totalOrders: 1,
        totalSpent: order.total || order.amount || 0,
        lastOrderDate: new Date(order.date || order.createdAt || Date.now()),
        status: (order.total || 0) > 500 ? "vip" : "active",
      });
    }
  });

  return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
};

export const getCustomerOrders = (customerEmail: string, orders: any[]) => {
  return orders.filter(
    (o) => (o.customerEmail || o.email || "").toLowerCase() === customerEmail.toLowerCase()
  );
};

export const getCustomerStatusColor = (status: Customer["status"]) => {
  switch (status) {
    case "vip": return "bg-purple-100 text-purple-700";
    case "active": return "bg-green-100 text-green-700";
    case "inactive": return "bg-gray-100 text-gray-600";
  }
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};
