"use client";

import { motion } from "framer-motion";
import { Tag, Clock, ArrowRight } from "lucide-react";

interface Bargain {
  product: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  endsIn: string;
  stock: number;
}

const demoBargains: Bargain[] = [
  { product: "Gaming Laptop X1", originalPrice: 1299, salePrice: 999, discount: 23, endsIn: "2h 15m", stock: 12 },
  { product: "Noise Cancelling Buds", originalPrice: 199, salePrice: 129, discount: 35, endsIn: "5h 30m", stock: 45 },
  { product: '4K Monitor 27"', originalPrice: 499, salePrice: 349, discount: 30, endsIn: "1d 4h", stock: 8 },
  { product: "Smart Home Hub", originalPrice: 149, salePrice: 89, discount: 40, endsIn: "3h 45m", stock: 23 },
];

export function RecentBargainsWidget() {
  return (
    <div className="space-y-3">
      {demoBargains.map((bargain, index) => (
        <motion.div
          key={bargain.product}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
          className="p-3 rounded-lg border border-gray-100 hover:border-red-200 hover:shadow-sm transition-all group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 text-sm truncate">{bargain.product}</h4>
                <span className="shrink-0 text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                  -{bargain.discount}%
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-lg font-bold text-gray-900">${bargain.salePrice}</span>
                <span className="text-sm text-gray-400 line-through">${bargain.originalPrice}</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              Ends in {bargain.endsIn}
            </div>
            <div className="text-xs text-gray-500">{bargain.stock} left in stock</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
