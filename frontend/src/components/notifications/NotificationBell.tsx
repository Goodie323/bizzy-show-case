"use client";

import { useState } from "react";
import { useNotificationContext } from "./NotificationProvider";
import { formatTimeAgo } from "@/lib/utils/notifications";
import { Bell, Check, Trash2, ExternalLink, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotificationContext();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="p-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400">
                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors group ${
                        !notif.read ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                          !notif.read ? "bg-blue-500" : "bg-transparent"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium ${!notif.read ? "text-gray-900" : "text-gray-600"}`}>
                              {notif.title}
                            </p>
                            <button
                              onClick={() => removeNotification(notif.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-gray-400">{formatTimeAgo(notif.timestamp)}</span>
                            <div className="flex items-center gap-2">
                              {!notif.read && (
                                <button
                                  onClick={() => markAsRead(notif.id)}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  Mark read
                                </button>
                              )}
                              {notif.link && (
                                <Link
                                  href={notif.link}
                                  onClick={() => markAsRead(notif.id)}
                                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
