"use client";

import { useNotificationContext } from "./NotificationProvider";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const typeConfig = {
  success: { icon: CheckCircle, bg: "bg-green-50", border: "border-green-200", text: "text-green-800", iconColor: "text-green-500" },
  error: { icon: AlertCircle, bg: "bg-red-50", border: "border-red-200", text: "text-red-800", iconColor: "text-red-500" },
  warning: { icon: AlertTriangle, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", iconColor: "text-yellow-500" },
  info: { icon: Info, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", iconColor: "text-blue-500" },
};

export function NotificationToast() {
  const { toasts, dismissToast } = useNotificationContext();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = typeConfig[toast.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`${config.bg} ${config.border} border rounded-lg shadow-lg p-4 flex items-start gap-3`}
            >
              <Icon className={`w-5 h-5 ${config.iconColor} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${config.text}`}>{toast.title}</p>
                <p className={`text-sm ${config.text} opacity-80 mt-0.5`}>{toast.message}</p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
