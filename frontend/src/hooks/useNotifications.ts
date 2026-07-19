"use client";

import { useState, useCallback, useEffect } from "react";
import { Notification, createNotification } from "@/lib/utils/notifications";

const STORAGE_KEY = "dashboard-notifications";

const loadNotifications = (): Notification[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored, (key, value) => {
      if (key === "timestamp") return new Date(value);
      return value;
    });
  } catch {
    return [];
  }
};

const saveNotifications = (notifications: Notification[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);
  const [toasts, setToasts] = useState<Notification[]>([]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotif = createNotification(notification.title, notification.message, notification.type, notification.link);
    setNotifications((prev) => [newNotif, ...prev]);
    setToasts((prev) => [...prev, newNotif]);

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newNotif.id));
    }, 5000);

    return newNotif.id;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    toasts,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    dismissToast,
  };
}
