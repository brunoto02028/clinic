import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get application name for email notifications
 * Returns a friendly app name instead of hostname
 */
export function getAppName(): string {
  return "Bruno Physical Rehabilitation";
}

/**
 * Get sender email for notifications
 */
export function getSenderEmail(): string {
  const appUrl = process.env.NEXTAUTH_URL || "";
  if (!appUrl) {
    return "noreply@bpr.rehab";
  }
  try {
    const hostname = new URL(appUrl).hostname;
    return `noreply@${hostname}`;
  } catch {
    return "noreply@bpr.rehab";
  }
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}