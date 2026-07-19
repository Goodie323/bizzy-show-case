"use client";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  read: boolean;
  link?: string;
}

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const createNotification = (
  title: string,
  message: string,
  type: Notification["type"] = "info",
  link?: string
): Notification => ({
  id: generateId(),
  title,
  message,
  type,
  timestamp: new Date(),
  read: false,
  link,
});

export const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};