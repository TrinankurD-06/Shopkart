import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Check, X } from "lucide-react";

const ToastContext = createContext(null);

const DURATION = 3200;

// Small confirmation messages ("Added to bag") that don't push the page around
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    ({ text, tone = "success", action }) => {
      const id = nextId.current++;
      // Keep at most three on screen
      setToasts((list) => [...list.slice(-2), { id, text, tone, action }]);
      setTimeout(() => dismiss(id), DURATION);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone === "error" ? "error" : ""}`}>
            <span className="toast-icon">
              {toast.tone === "error" ? <AlertCircle size={14} /> : <Check size={14} />}
            </span>
            <span className="toast-text">{toast.text}</span>
            {toast.action && (
              <Link to={toast.action.to} onClick={() => dismiss(toast.id)}>
                {toast.action.label}
              </Link>
            )}
            <button type="button" className="toast-action" aria-label="Dismiss" onClick={() => dismiss(toast.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
