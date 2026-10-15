import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// Small accessible dialog: Escape and the backdrop close it, focus moves inside
function Modal({ title, subtitle, onClose, children, busy = false }) {
  const panel = useRef(null);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector("input, textarea, button")?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, busy]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={panel}>
        <div className="modal-head">
          <div>
            <h2 id="modal-title" className="panel-title">
              {title}
            </h2>
            {subtitle && <p className="panel-sub">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
