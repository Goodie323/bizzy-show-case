"use client";

import { Customer, getCustomerOrders, formatCurrency } from "@/lib/utils/customers";
import { X, Package, Calendar, DollarSign, CheckCircle, Clock, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

interface CustomerOrdersModalProps {
  customer: Customer | null;
  orders: any[];
  onClose: () => void;
}

const statusConfig = {
  completed: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", label: "Completed" },
  pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50", label: "Pending" },
  processing: { icon: Clock, color: "text-blue-500", bg: "bg-blue-50", label: "Processing" },
  cancelled: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Cancelled" },
};

export function CustomerOrdersModal({ customer, orders, onClose }: CustomerOrdersModalProps) {
  const customerOrders = useMemo(() => {
    if (!customer) return [];
    return getCustomerOrders(customer.email, orders).sort(
      (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
    );
  }, [customer, orders]);

  if (!customer) return null;

  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                <p className="text-gray-500 text-sm">{customer.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{customer.totalOrders}</p>
              <p className="text-sm text-gray-500 mt-1">Total Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(customer.totalSpent)}</p>
              <p className="text-sm text-gray-500 mt-1">Total Spent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(customer.totalSpent / (customer.totalOrders || 1))}
              </p>
              <p className="text-sm text-gray-500 mt-1">Avg. Order</p>
            </div>
          </div>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Order History
            </h3>
            {customerOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No orders found for this customer.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerOrders.map((order, idx) => {
                  const status = (order.status || "pending").toLowerCase() as keyof typeof statusConfig;
                  const config = statusConfig[status] || statusConfig.pending;
                  const StatusIcon = config.icon;

                  return (
                    <motion.div
                      key={order.id || idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                      <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
                        <StatusIcon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">Order #{order.id || idx + 1}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(order.date || order.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            {formatCurrency(order.total || order.amount || 0)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
