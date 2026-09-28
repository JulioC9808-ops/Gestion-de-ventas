import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generador seguro de IDs únicos compatible con Android antiguo, WebViews, HTTP y contextos inseguros
 */
export function safeRandomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback if randomUUID is restricted
  }
  return 'id_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
}

