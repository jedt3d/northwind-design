import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const TOAST_ICONS = { info: Info, success: CheckCircle2, error: AlertCircle };

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts((ts) => [...ts, { id, message, type }]);
    setTimeout(() => {
      setToasts((ts) => ts.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => {
          const Icon = TOAST_ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`toast toast--${t.type}`} role={t.type === 'error' ? 'alert' : undefined}>
              <Icon aria-hidden="true" />
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns toast(message, type?: 'info'|'success'|'error'). */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
