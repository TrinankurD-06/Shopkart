import { Check, ClipboardCheck, IndianRupee, Package, PackageCheck, RotateCcw, Truck, Undo2, X } from "lucide-react";
import { EVENT_LABELS, ORDER_STEPS, formatDateTime, statusLabel } from "../utils/format.js";

const STEP_ICONS = { PLACED: Package, CONFIRMED: ClipboardCheck, SHIPPED: Truck, DELIVERED: PackageCheck };
const STEP_NOTES = {
  PLACED: "Payment received and order created",
  CONFIRMED: "Packed and ready at our warehouse",
  SHIPPED: "Handed to the courier",
  DELIVERED: "Delivered to your address",
};

// After-sales events and how they look on the timeline
const EVENT_STYLES = {
  RETURN_REQUESTED: { icon: RotateCcw, tone: "done" },
  RETURN_WITHDRAWN: { icon: Undo2, tone: "muted" },
  RETURN_APPROVED: { icon: Check, tone: "done" },
  RETURN_REJECTED: { icon: X, tone: "cancel" },
  RETURNED: { icon: PackageCheck, tone: "done" },
  REFUNDED: { icon: IndianRupee, tone: "done" },
};

// When each step happened. Orders placed before history was recorded fall back to paidAt.
const stepTimes = (order) => {
  const times = {};
  for (const entry of order.statusHistory || []) if (!times[entry.status]) times[entry.status] = entry.at;
  if (!times.PLACED && order.paidAt) times.PLACED = order.paidAt;
  return times;
};

// Thin four-segment bar used on order rows
export function ProgressLine({ status }) {
  const stopped = status === "CANCELLED";
  const current = stopped ? 0 : status === "RETURNED" ? ORDER_STEPS.length - 1 : ORDER_STEPS.indexOf(status);
  return (
    <div className={`progress-line ${stopped ? "cancelled" : ""}`} aria-label={`Order ${statusLabel(status)}`}>
      {ORDER_STEPS.map((step, index) => (
        <i key={step} className={index <= current ? "on" : ""} />
      ))}
    </div>
  );
}

// Vertical timeline with a date beside every completed step, followed by
// cancellation / return / refund events in the order they happened
function OrderTimeline({ order }) {
  const times = stepTimes(order);
  const cancelled = order.status === "CANCELLED";
  const fulfilled = cancelled ? -1 : order.status === "RETURNED" ? ORDER_STEPS.length - 1 : ORDER_STEPS.indexOf(order.status);
  const events = (order.statusHistory || []).filter((entry) => EVENT_LABELS[entry.status]);
  const lastEvent = events[events.length - 1];

  // A cancelled order shows only the steps it actually reached
  const steps = cancelled ? ORDER_STEPS.filter((step) => times[step]) : ORDER_STEPS;

  return (
    <ol className="timeline">
      {steps.map((step, index) => {
        const done = cancelled || index <= fulfilled;
        const Icon = STEP_ICONS[step];
        const current = !cancelled && !events.length && index === fulfilled;
        return (
          <li key={step} className={`${done ? "done" : ""} ${current ? "current" : ""}`}>
            <span className="timeline-dot">{done ? <Check size={14} strokeWidth={2.5} /> : <Icon size={13} />}</span>
            <div>
              <strong>{statusLabel(step)}</strong>
              <small>{done && times[step] ? formatDateTime(times[step]) : STEP_NOTES[step]}</small>
            </div>
          </li>
        );
      })}

      {cancelled && (
        <li className={`cancel ${!events.length ? "current" : ""}`}>
          <span className="timeline-dot">
            <X size={14} strokeWidth={2.5} />
          </span>
          <div>
            <strong>Cancelled</strong>
            <small>
              {times.CANCELLED ? formatDateTime(times.CANCELLED) : "This order was cancelled"}
              {order.cancellation?.by === "customer" ? " · by you" : order.cancellation ? " · by the store" : ""}
              {order.cancellation?.reason ? ` · “${order.cancellation.reason}”` : ""}
            </small>
          </div>
        </li>
      )}

      {events.map((entry, index) => {
        const { icon: Icon, tone } = EVENT_STYLES[entry.status];
        return (
          <li key={`${entry.status}-${index}`} className={`${tone === "done" ? "done" : tone} ${entry === lastEvent ? "current" : ""}`}>
            <span className="timeline-dot">
              <Icon size={13} strokeWidth={2.4} />
            </span>
            <div>
              <strong>{EVENT_LABELS[entry.status]}</strong>
              <small>{formatDateTime(entry.at)}</small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default OrderTimeline;
