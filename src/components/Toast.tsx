/**
 * Toast notification system
 * Provides lightweight notifications for errors and success messages
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'error' | 'success';
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  exiting?: boolean;
}

interface ToastOptions {
  type?: 'error' | 'success';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  show: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    // Start exit animation
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const show = useCallback((message: string, options?: ToastOptions): string => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    const newToast: ToastMessage = {
      id,
      message,
      type: options?.type ?? 'error',
      duration: options?.duration ?? 3000,
      action: options?.action,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      dismiss(id);
    }, newToast.duration);

    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              max-w-sm p-3 rounded-lg shadow-lg border pointer-events-auto
              transition-all duration-200 ease-out
              ${t.exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
              ${t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }
            `}
            style={{
              transform: t.exiting ? 'translateX(1rem)' : 'translateX(0)',
            }}
          >
            <div className="flex items-start gap-3">
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
              >
                <X className="w-4 h-4 opacity-50 hover:opacity-100" />
              </button>
            </div>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                className={`
                  mt-2 text-sm font-medium underline underline-offset-2
                  ${t.type === 'error'
                    ? 'text-red-700 hover:text-red-900'
                    : 'text-emerald-700 hover:text-emerald-900'
                  }
                `}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Global toast reference for the standalone toast function
let globalToast: ((message: string, options?: ToastOptions) => string) | null = null;

// Hook to register the global toast function
export function useRegisterGlobalToast() {
  const { show } = useToast();

  useEffect(() => {
    globalToast = show;
    return () => {
      globalToast = null;
    };
  }, [show]);
}

/**
 * Standalone toast function for use outside of React context
 * Must be called after ToastProvider is mounted
 */
export function toast(message: string, options?: ToastOptions): string {
  if (!globalToast) {
    console.warn('Toast not initialized. Ensure ToastProvider is mounted.');
    return '';
  }
  return globalToast(message, options);
}
