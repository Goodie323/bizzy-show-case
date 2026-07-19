import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`
}

export function formatPhone(phone: string): string {
  if (phone.length > 8) {
    return phone.slice(0, 4) + "****" + phone.slice(-4)
  }
  return phone
}

export function getInitials(str: string): string {
  return str.slice(-2).toUpperCase()
}
