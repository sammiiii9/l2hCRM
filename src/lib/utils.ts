import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number to Indian Currency format (e.g. ₹1.25 Cr, ₹75 Lakhs, ₹50,000)
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0";
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const lakh = amount / 100000;
    return `₹${lakh % 1 === 0 ? lakh : lakh.toFixed(2)} L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats relative time (e.g. "12d ago", "2h ago", "Just now", "Tomorrow")
 */
export function formatRelativeTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "Never";
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  if (diffSec >= 0) return "Just now";

  // Future dates
  const futureDays = Math.abs(diffDays);
  if (futureDays === 1) return "Tomorrow";
  if (futureDays > 1) return `In ${futureDays}d`;
  return "Upcoming";
}

/**
 * Formats a clean date string e.g. "10 Aug" or "10 Aug 2026"
 */
export function formatDate(dateInput: Date | string | null | undefined, includeYear = false): string {
  if (!dateInput) return "--";
  const date = new Date(dateInput);
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  };
  return date.toLocaleDateString("en-IN", options);
}

/**
 * Masks a phone number (e.g. "919711203491" -> "9197••••••••")
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "--";
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length <= 4) return phone;
  const visible = cleaned.slice(0, 4);
  const masked = "•".repeat(Math.max(6, cleaned.length - 4));
  return `${visible}${masked}`;
}

/**
 * Generates WhatsApp click-to-chat URL with optional pre-filled message
 */
export function getWhatsAppUrl(phone: string | null | undefined, message?: string): string {
  if (!phone) return "#";
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  const defaultMsg = message || "Hello, I am contacting you regarding your property requirement with L2H Real Estate.";
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(defaultMsg)}`;
}
