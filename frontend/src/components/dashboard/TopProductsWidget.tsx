"use client";

import { motion } from "framer-motion";
import { TrendingUp, Package } from "lucide-react";

interface Product {
  name: string;
  sales: number;
  revenue: number;
  trend: number;
}

const demoProducts: Product[] = [
  { name: "Wireless Headphones", sales: 142, revenue: 14200, trend: 12.5 },
  { name: "Smart Watch Pro", sales: 98, revenue: 24500, trend: 8.3 },
  { name: "USB-C Hub", sales: 234, revenue: 7020, trend: -3.2 },
  { name: "Mechanical Keyboard", sales: 67, revenue: 10050, trend: 15.7 },
  { name: "Webcam 4K", sales: 89, revenue: 10680, trend: 5.1 },
];

export function TopProductsWidget() {
  const maxRevenue = Math.max(...demoProducts.map((p) => p.revenue));

  return (
    <div className="space-y-4">
      {demoProducts.map((product, index) => (
        <motion.div
          key={product.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <span className="font-medium text-gray-900 text-sm">{product.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">${(product.revenue / 1000).toFixed(1)}k</span>
              <span
                className={`text-xs font-medium flex items-center gap-0.5 ${
                  product.trend >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                <TrendingUp
                  className={`w-3 h-3 ${product.trend < 0 ? "rotate-180" : ""}`}
                />
                {Math.abs(product.trend)}%
              </span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
              transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{product.sales} sales</p>
        </motion.div>
      ))}
    </div>
  );
}
