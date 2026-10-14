import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { fetchOrder, getErrorMessage } from "../services/api.js";
import { formatDateTime, formatPrice, shortId } from "../utils/format.js";

// Receipt-style confirmation screen
function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrder(id)
      .then((data) => setOrder(data.order))
      .catch((err) => setError(getErrorMessage(err, "Could not load your order.")));
  }, [id]);

  if (error) {
    return (
      <StateMessage icon="⚠️" tone="error" title="Something went wrong" text={error}>
        <Link to="/orders" className="btn btn-primary">
          View My Orders
        </Link>
      </StateMessage>
    );
  }

  if (!order) return <Loader text="Loading your receipt..." />;

  if (order.paymentStatus !== "PAID") {
    return (
      <StateMessage icon="⏳" title="Payment not completed" text="This order has not been paid, so it was not placed. Your cart is unchanged.">
        <Link to="/cart" className="btn btn-primary">
          Back to Cart
        </Link>
      </StateMessage>
    );
  }

  return (
    <section className="receipt-wrap">
      <div className="receipt">
        <div className="receipt-head">
          <div className="receipt-check">✓</div>
          <h1>Order Placed Successfully</h1>
          <p className="muted">Thank you for shopping with ShopKart!</p>
        </div>

        <dl className="receipt-meta">
          <div>
            <dt>Order ID</dt>
            <dd title={order._id}>{shortId(order._id)}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formatDateTime(order.paidAt || order.createdAt)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{order.status}</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{order.paymentStatus}</dd>
          </div>
        </dl>

        <ul className="receipt-items">
          {order.items.map((item) => (
            <li key={item.product}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="receipt-total">
          <span>Total Paid</span>
          <span>{formatPrice(order.totalAmount)}</span>
        </div>

        <p className="receipt-note">
          Shipping to {order.shippingAddress.fullName}, {order.shippingAddress.city} - {order.shippingAddress.pincode}
          <br />
          Payment ID: {order.razorpayPaymentId}
        </p>
      </div>

      <div className="receipt-actions">
        <Link to="/orders" className="btn btn-primary">
          View My Orders
        </Link>
        <Link to="/products" className="btn btn-outline">
          Continue Shopping
        </Link>
      </div>
    </section>
  );
}

export default OrderSuccess;
