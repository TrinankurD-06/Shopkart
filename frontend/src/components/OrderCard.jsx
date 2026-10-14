import { Link } from "react-router-dom";
import { formatDate, formatPrice, shortId } from "../utils/format.js";
import OrderTracker from "./OrderTracker.jsx";

function OrderCard({ order }) {
  return (
    <article className="card order-card">
      <div className="order-card-head">
        <div>
          <h3>Order {shortId(order._id)}</h3>
          <p className="muted">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
      </div>

      <ul className="order-card-items">
        {order.items.map((item) => (
          <li key={item.product}>
            {item.name} × {item.quantity}
          </li>
        ))}
      </ul>

      <OrderTracker status={order.status} compact />

      <div className="order-card-foot">
        <p>
          Total: <strong>{formatPrice(order.totalAmount)}</strong>
        </p>
        <Link to={`/orders/${order._id}`} className="btn btn-outline btn-small">
          View Details
        </Link>
      </div>
    </article>
  );
}

export default OrderCard;
