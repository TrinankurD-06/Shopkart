import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import OrderTracker from "../components/OrderTracker.jsx";
import { advanceOrderStatus, fetchOrder, getErrorMessage } from "../services/api.js";
import { formatDateTime, formatPrice, handleImageError, shortId } from "../utils/format.js";

const NEXT_STATUS = { PLACED: "CONFIRMED", CONFIRMED: "SHIPPED", SHIPPED: "DELIVERED" };

function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  useEffect(() => {
    let ignore = false;
    setOrder(null);
    setError(null);
    fetchOrder(id)
      .then((data) => !ignore && setOrder(data.order))
      .catch((err) => !ignore && setError(getErrorMessage(err, "Could not load this order.")));
    return () => {
      ignore = true;
    };
  }, [id]);

  // Bonus: demo-only button that moves the order to the next status
  const handleAdvance = async () => {
    setUpdating(true);
    setUpdateError("");
    try {
      const data = await advanceOrderStatus(order._id, NEXT_STATUS[order.status]);
      setOrder(data.order);
    } catch (err) {
      setUpdateError(getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  if (error) {
    return (
      <StateMessage icon="🔎" tone="error" title="Order not found" text={error}>
        <Link to="/orders" className="btn btn-primary">
          Back to My Orders
        </Link>
      </StateMessage>
    );
  }

  if (!order) return <Loader text="Loading order..." />;

  const address = order.shippingAddress;
  const isPaid = order.paymentStatus === "PAID";

  return (
    <section>
      <Link to="/orders" className="back-link">
        ← Back to My Orders
      </Link>

      <div className="page-head">
        <div>
          <h1>Order {shortId(order._id)}</h1>
          <p className="muted">Placed on {formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
      </div>

      {isPaid ? (
        <div className="card panel tracker-panel">
          <OrderTracker status={order.status} />
          {NEXT_STATUS[order.status] && (
            <div className="dev-tools">
              <button type="button" className="btn btn-small btn-outline" onClick={handleAdvance} disabled={updating}>
                {updating ? "Updating..." : `Simulate next step → ${NEXT_STATUS[order.status]}`}
              </button>
              <span className="hint">Demo only - stands in for an admin panel.</span>
            </div>
          )}
          {updateError && <p className="field-error">{updateError}</p>}
        </div>
      ) : (
        <div className="alert alert-error tracker-panel">This order was not paid ({order.paymentStatus}), so it was never placed.</div>
      )}

      <div className="two-col">
        <div className="card panel">
          <h2>Items</h2>
          <ul className="order-items">
            {order.items.map((item) => (
              <li key={item.product}>
                <img src={item.image} alt={item.name} onError={handleImageError} />
                <div>
                  <Link to={`/products/${item.product}`}>{item.name}</Link>
                  <p className="muted">
                    {formatPrice(item.price)} × {item.quantity}
                  </p>
                </div>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </li>
            ))}
          </ul>
          <p className="hint">Prices shown are what you paid at the time of purchase.</p>
        </div>

        <aside className="summary">
          <h2>Summary</h2>
          <div className="summary-total">
            <span>Total</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
          <div className="summary-row">
            <span>Payment</span>
            <span>{order.paymentStatus}</span>
          </div>
          {order.razorpayPaymentId && (
            <div className="summary-row small">
              <span>Payment ID</span>
              <span>{order.razorpayPaymentId}</span>
            </div>
          )}
          <h3>Shipping To</h3>
          <address>
            {address.fullName}
            <br />
            {address.addressLine1}
            <br />
            {address.city}, {address.state} - {address.pincode}
            <br />
            📞 {address.phone}
          </address>
        </aside>
      </div>
    </section>
  );
}

export default OrderDetails;
