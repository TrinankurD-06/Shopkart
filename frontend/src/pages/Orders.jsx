import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Package } from "lucide-react";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { ProgressLine } from "../components/OrderProgress.jsx";
import { fetchOrders } from "../services/api.js";
import { REFUND_LABELS, RETURN_LABELS, formatDate, formatPrice, handleImageError, shortId, statusLabel } from "../utils/format.js";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "In progress" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "returns", label: "Returns & refunds" },
];

const matches = (order, filter) => {
  if (filter === "all") return true;
  if (filter === "active") return ["PLACED", "CONFIRMED", "SHIPPED"].includes(order.status);
  if (filter === "returns") return order.status === "RETURNED" || Boolean(order.returnRequest || order.refund);
  return order.status === filter;
};

function OrderRow({ order }) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const shown = order.items.slice(0, 3);
  const extra = order.items.length - shown.length;

  return (
    <Link to={`/orders/${order._id}`} className="order-row">
      <div className="thumb-stack" aria-hidden="true">
        {shown.map((item) => (
          <span key={item.product}>
            <img src={item.image} alt="" onError={handleImageError} />
          </span>
        ))}
        {extra > 0 && <span className="more">+{extra}</span>}
      </div>

      <div className="order-row-main">
        <div className="top">
          <strong className="mono">{shortId(order._id)}</strong>
          <span className={`pill pill-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
          {order.returnRequest && order.status !== "RETURNED" && (
            <span className={`pill pill-return-${order.returnRequest.status.toLowerCase()}`}>{RETURN_LABELS[order.returnRequest.status]}</span>
          )}
          {order.refund && <span className={`pill pill-refund-${order.refund.status.toLowerCase()}`}>{REFUND_LABELS[order.refund.status]}</span>}
        </div>
        <div className="items">{order.items.map((item) => item.name).join(", ")}</div>
        <ProgressLine status={order.status} />
      </div>

      <div className="order-row-side">
        <span className="price">{formatPrice(order.totalAmount)}</span>
        <span className="muted small">
          {units} item{units === 1 ? "" : "s"} · {formatDate(order.createdAt)}
        </span>
      </div>
    </Link>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("all");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchOrders();
      setOrders(data.orders);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (loading) return <Loader text="Loading your orders..." />;

  if (error) {
    return (
      <StateMessage icon={AlertTriangle} tone="error" title="We couldn't load your orders">
        <button type="button" className="btn btn-primary" onClick={loadOrders}>
          Try again
        </button>
      </StateMessage>
    );
  }

  if (orders.length === 0) {
    return (
      <StateMessage icon={Package} title="No orders yet" text="When you place an order, you'll be able to track it here.">
        <Link to="/products" className="btn btn-primary">
          Start shopping
        </Link>
      </StateMessage>
    );
  }

  const visible = orders.filter((order) => matches(order, filter));
  // Cancelled and returned orders are refunded, so they don't count as spent
  const spent = orders.filter((order) => !["CANCELLED", "RETURNED"].includes(order.status)).reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>Orders</h1>
          <p className="muted">
            {orders.length} order{orders.length === 1 ? "" : "s"} · <span className="mono">{formatPrice(spent)}</span> spent
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Filter orders">
          {FILTERS.map((option) => (
            <button key={option.value} type="button" className={filter === option.value ? "on" : ""} onClick={() => setFilter(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="muted center" style={{ padding: "40px 0" }}>
          No {FILTERS.find((option) => option.value === filter).label.toLowerCase()} orders.
        </p>
      ) : (
        <div className="order-list">
          {visible.map((order) => (
            <OrderRow key={order._id} order={order} />
          ))}
        </div>
      )}
    </section>
  );
}

export default Orders;
