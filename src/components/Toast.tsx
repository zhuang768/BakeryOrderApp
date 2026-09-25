import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ToastContext } from "../toast-context";

interface ToastItem {
  id: number;
  message: string;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 2800);
  }, []);
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((item) => (
          <p key={item.id} className="toast">
            {item.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
