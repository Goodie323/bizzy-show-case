"use client";

import { Customer, formatCurrency, getCustomerStatusColor } from "@/lib/utils/customers";
import { User, Mail, Phone, ShoppingBag, DollarSign, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface CustomerCardProps {
  customer: Customer;
  index: number;
  onClick: () => void;
}

export function CustomerCard({ customer, index, onClick }: CustomerCardProps) {
  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{customer.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCustomerStatusColor(customer.status)}`}>
              {customer.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-gray-500 text-sm">
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">{customer.email}</span>
          </div>
          {customer.phone && (
            <div className="flex items-center gap-1 mt-0.5 text-gray-500 text-sm">
              <Phone className="w-3.5 h-3.5" />
              <span>{customer.phone}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="text-xs">Orders</span>
          </div>
          <p className="font-bold text-gray-900">{customer.totalOrders}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-xs">Spent</span>
          </div>
          <p className="font-bold text-gray-900">{formatCurrency(customer.totalSpent)}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs">Last Order</span>
          </div>
          <p className="font-bold text-gray-900 text-sm">
            {customer.lastOrderDate.toLocaleDateString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
