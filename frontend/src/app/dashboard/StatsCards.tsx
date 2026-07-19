"use client";

import { motion } from "framer-motion";
import { DollarSign, ShoppingCart, Users, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  delay: number;
}

function StatCard({ title, value, change, icon, color, delay }: StatCardProps) {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <span className={`text-xs font-medium flex items-center gap-0.5 px-2 py-1 rounded-full ${
          isPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change)}%
        </span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
      </div>
    </motion.div>
  );
}

export function StatsCards() {
  const stats = [
    {
      title: "Total Revenue",
      value: "$48,294",
      change: 12.5,
      icon: <DollarSign className="w-5 h-5 text-blue-600" />,
      color: "bg-blue-50",
    },
    {
      title: "Total Orders",
      value: "1,429",
      change: 8.2,
      icon: <ShoppingCart className="w-5 h-5 text-purple-600" />,
      color: "bg-purple-50",
    },
    {
      title: "Active Customers",
      value: "892",
      change: -2.4,
      icon: <Users className="w-5 h-5 text-green-600" />,
      color: "bg-green-50",
    },
    {
      title: "Products Sold",
      value: "3,847",
      change: 15.3,
      icon: <Package className="w-5 h-5 text-orange-600" />,
      color: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={stat.title} {...stat} delay={index * 0.1} />
      ))}
    </div>
  );
}