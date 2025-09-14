import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

export type ToastData = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

export function useToast(): { toasts: ToastData[] } {
  // Placeholder hook to satisfy build; returns no toasts.
  // Swap with a full toast store/dispatcher if runtime toasts are needed.
  return { toasts: [] };
}


