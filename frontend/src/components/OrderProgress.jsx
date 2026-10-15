import { Check, Package, PackageCheck, Truck, X, ClipboardCheck } from "lucide-react";
import { ORDER_STEPS, formatDateTime, statusLabel } from "../utils/format.js";

const STEP_ICONS = { PLACED: Package, CONFIRMED: ClipboardCheck, SHIPPED: Truck, DELIVERED: PackageCheck };
const STEP_NOTES = {
  PLACED: "Payment received and order created",
  CONFIRMED: "Packed and ready at our warehouse",
  SHIPPED: "Handed to the courier",
  DELIVERED: "Delivered to your address",
};

// When each step happened. Orders placed before history was recorded fall back to paidAt.
const stepTimes = (order) => {
  const times = {};
  for (const entry of order.statusHistory || []) times[entry.status] = entry.at;
  if (!times.PLACED && order.paidAt) times.PLACED = order.paidAt;
  return times;
};

// Thin four-segment bar used on order rows
export function ProgressLine({ status }) {
  const cancelled = status === "CANCELLED";
  const current = cancelled ? 0 : ORDER_STEPS.indexOf(status);
  return (
    <div className={`progress-line ${cancelled ? "cancelled" : ""}`} aria-label={`Order ${statusLabel(status)}`}>
      {ORDER_STEPS.map((step, index) => (
        <i key={step} className={index <= current ? "on" : ""} />
      ))}
    </div>
  );
}

// Vertical timeline with a date beside every completed step
function OrderTimeline({ order }) {
  const times = stepTimes(order);
  const cancelled = order.status === "CANCELLED";
  const current = ORDER_STEPS.indexOf(order.status);

  // A cancelled order shows the steps it actually reached, then the cancellation
  const steps = cancelled ? ORDER_STEPS.filter((step) => times[step]) : ORDER_STEPS;

  return (
    <ol className="timeline">
      {steps.map((step, index) => {
        const done = cancelled || index <= current;
        const Icon = STEP_ICONS[step];
        return (
          <li key={step} className={`${done ? "done" : ""} ${!cancelled && index === current ? "current" : ""}`}>
            <span className="timeline-dot">{done ? <Check size={14} strokeWidth={2.5} /> : <Icon size={13} />}</span>
            <div>
              <strong>{statusLabel(step)}</strong>
              <small>{done && times[step] ? formatDateTime(times[step]) : STEP_NOTES[step]}</small>
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="cancel current">
          <span className="timeline-dot">
            <X size={14} strokeWidth={2.5} />
          </span>
          <div>
            <strong>Cancelled</strong>
            <small>{times.CANCELLED ? `${formatDateTime(times.CANCELLED)} · cancelled by the store` : "This order was cancelled by the store"}</small>
          </div>
        </li>
      )}
    </ol>
  );
}

export default OrderTimeline;
