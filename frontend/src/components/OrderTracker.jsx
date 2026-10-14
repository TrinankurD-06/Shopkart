const STEPS = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];
const LABELS = { PLACED: "Placed", CONFIRMED: "Confirmed", SHIPPED: "Shipped", DELIVERED: "Delivered" };

// Visual progress of an order: Placed -> Confirmed -> Shipped -> Delivered
function OrderTracker({ status, compact = false }) {
  const current = STEPS.indexOf(status);

  return (
    <ol className={`tracker ${compact ? "tracker-compact" : ""}`}>
      {STEPS.map((step, index) => (
        <li key={step} className={index <= current ? "done" : ""}>
          <span className="tracker-dot">{index <= current ? "✓" : index + 1}</span>
          <span className="tracker-label">{LABELS[step]}</span>
        </li>
      ))}
    </ol>
  );
}

export default OrderTracker;
