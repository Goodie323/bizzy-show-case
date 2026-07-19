"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

type Period = "7d" | "30d" | "90d" | "1y";

interface DataPoint {
  label: string;
  value: number;
  orders: number;
}

const data: Record<Period, DataPoint[]> = {
  "7d": [
    { label: "Mon", value: 1200, orders: 12 },
    { label: "Tue", value: 1900, orders: 19 },
    { label: "Wed", value: 1500, orders: 15 },
    { label: "Thu", value: 2400, orders: 24 },
    { label: "Fri", value: 2800, orders: 28 },
    { label: "Sat", value: 2100, orders: 21 },
    { label: "Sun", value: 1700, orders: 17 },
  ],
  "30d": [
    { label: "W1", value: 8500, orders: 85 },
    { label: "W2", value: 11200, orders: 112 },
    { label: "W3", value: 9800, orders: 98 },
    { label: "W4", value: 13500, orders: 135 },
  ],
  "90d": [
    { label: "Jan", value: 35000, orders: 350 },
    { label: "Feb", value: 42000, orders: 420 },
    { label: "Mar", value: 38000, orders: 380 },
  ],
  "1y": [
    { label: "Q1", value: 115000, orders: 1150 },
    { label: "Q2", value: 142000, orders: 1420 },
    { label: "Q3", value: 128000, orders: 1280 },
    { label: "Q4", value: 165000, orders: 1650 },
  ],
};

export function SalesTrendWidget() {
  const [period, setPeriod] = useState<Period>("30d");
  const currentData = data[period];
  const maxValue = Math.max(...currentData.map((d) => d.value));
  const totalRevenue = currentData.reduce((sum, d) => sum + d.value, 0);
  const totalOrders = currentData.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalRevenue / totalOrders;

  const firstValue = currentData[0].value;
  const lastValue = currentData[currentData.length - 1].value;
  const growth = ((lastValue - firstValue) / firstValue) * 100;

  return (
    <div className="space-y-4">
      {/* Period Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {(["7d", "30d", "90d", "1y"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              period === p
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">${(totalRevenue / 1000).toFixed(1)}k</p>
          <p className="text-xs text-gray-500 mt-0.5">Revenue</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{totalOrders}</p>
          <p className="text-xs text-gray-500 mt-0.5">Orders</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-lg font-bold text-gray-900">${avgOrderValue.toFixed(0)}</p>
            <span
              className={`text-xs font-medium flex items-center ${
                growth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {growth >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(growth).toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Avg. Order</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end gap-2 h-32">
        {currentData.map((point, index) => (
          <div key={point.label} className="flex-1 flex flex-col items-center gap-1.5">
            <motion.div
              key={`${period}-${index}`}
              initial={{ height: 0 }}
              animate={{ height: `${(point.value / maxValue) * 100}%` }}
              transition={{ delay: index * 0.05, duration: 0.5, type: "spring" }}
              className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md min-h-[4px] relative group"
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                ${point.value.toLocaleString()}
              </div>
            </motion.div>
            <span className="text-xs text-gray-500 font-medium">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
