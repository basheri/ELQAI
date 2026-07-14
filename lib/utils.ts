import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// WHY: shadcn/ui's standard class merge helper — resolves Tailwind class
// conflicts while allowing conditional class composition.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
