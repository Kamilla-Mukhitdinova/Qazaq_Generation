import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDisplayTicketTitle(title: string) {
  return title.replace(/^\[(DEMO-KPI|Demo Filter)\]\s*/i, '');
}
