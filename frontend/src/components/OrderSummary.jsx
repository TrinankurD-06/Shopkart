import { formatPrice, handleImageError } from "../utils/format.js";

// items: [{ key, name, price, quantity, image }]
function OrderSummary({ items, total, title = "Order summary", children }) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside className="summary sticky">
      <h2>{title}</h2>
      <ul className="summary-lines">
        {items.map((item) => (
          <li key={item.key}>
            <span className="mini-thumb">
              <img src={item.image} alt="" onError={handleImageError} />
              {item.quantity > 1 && <span className="qty">{item.quantity}</span>}
            </span>
            <span>{item.name}</span>
            <span className="price small">{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="summary-row" style={{ marginTop: 14 }}>
        <span>
          Subtotal · {count} item{count === 1 ? "" : "s"}
        </span>
        <span className="mono">{formatPrice(total)}</span>
      </div>
      <div className="summary-row">
        <span>Delivery</span>
        <span className="free">Free</span>
      </div>
      <div className="summary-total">
        <span>Total</span>
        <span className="price">{formatPrice(total)}</span>
      </div>
      {children}
    </aside>
  );
}

export default OrderSummary;
