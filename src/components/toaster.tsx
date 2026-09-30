"use client";
// ============================================================================
// TOASTER — little popup messages ("Posted!", "Join request sent!").
//
// 👉 CONCEPT: "React Context" = a shared box of state any component can open
//    with a hook (useToast), no prop-drilling through 10 layers.
// ============================================================================

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface Toast { id: number; kind: "success" | "error"; text: string }
interface ToastContextValue {
  toast: (text: string, kind?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, kind, text }]);
    // Auto-remove after 4 seconds.
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = (id: number) => setToasts((list) => list.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Fixed overlay in the bottom-right corner */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto animate-toast-in flex items-start gap-3 rounded-xl border border-ink/10 bg-white p-3.5 pr-9 shadow-warm-lg"
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-ember" />
            )}
            <p className="text-sm leading-snug text-ink">{t.text}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="absolute right-2 top-2 rounded-full p-1 text-ink/40 hover:bg-paper hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
