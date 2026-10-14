import { formatPrice } from "../utils/format.js";

// items: [{ name, price, quantity }]
function OrderSummary({ items, total, title = "Order Summary", children }) {
  return (
    <div className="summary">
      <h2>{title}</h2>
      <ul className="summary-lines">
        {items.map((item) => (
          <li key={item.key}>
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="summary-total">
        <span>Total</span>
        <span>{formatPrice(total)}</span>
      </div>
      {children}
    </div>
  );
}

export default OrderSummary;
