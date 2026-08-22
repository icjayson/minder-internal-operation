import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Shared class-name merger for the local Minder Ops component library. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
