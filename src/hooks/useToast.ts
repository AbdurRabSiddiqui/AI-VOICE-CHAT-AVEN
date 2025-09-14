import * as React from "react";
import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast";

export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type ToastContextValue = {
  toasts: ToasterToast[];
};

const ToastContext = React.createContext<ToastContextValue>({ toasts: [] });

export function useToast(): ToastContextValue {
  return React.useContext(ToastContext);
}

export default useToast;


