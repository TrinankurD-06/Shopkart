import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Check, Clock } from "lucide-react";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { fetchOrder, getErrorMessage } from "../services/api.js";
import { deliveryWindow, formatDateTime, formatPrice, shortId } from "../utils/format.js";

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
      <StateMessage icon={AlertTriangle} tone="error" title="Something went wrong" text={error}>
        <Link to="/orders" className="btn btn-primary">
          View my orders
        </Link>
      </StateMessage>
    );
  }

  if (!order) return <Loader text="Printing your receipt..." />;

  if (order.paymentStatus !== "PAID") {
    return (
      <StateMessage icon={Clock} title="Payment not completed" text="This order hasn't been paid, so it wasn't placed. Your bag is unchanged.">
        <Link to="/cart" className="btn btn-primary">
          Back to bag
        </Link>
      </StateMessage>
    );
  }

  const address = order.shippingAddress;
  const { earliest, latest } = deliveryWindow(new Date(order.paidAt || order.createdAt));
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="receipt-wrap">
      <div className="receipt">
        <span className="receipt-stamp" aria-hidden="true">
          PAID
        </span>
        <div className="receipt-head">
          <div className="receipt-check">
            <Check size={26} strokeWidth={2.5} />
          </div>
          <h1>Thank you, order placed.</h1>
          <p className="muted" style={{ margin: 0 }}>
            Arriving between <strong style={{ color: "var(--ink)" }}>{earliest}</strong> and{" "}
            <strong style={{ color: "var(--ink)" }}>{latest}</strong>
          </p>
        </div>

        <dl className="receipt-meta">
          <div>
            <dt>Order</dt>
            <dd title={order._id}>{shortId(order._id)}</dd>
          </div>
          <div>
            <dt>Paid on</dt>
            <dd>{formatDateTime(order.paidAt || order.createdAt)}</dd>
          </div>
          <div>
            <dt>Items</dt>
            <dd>{units}</dd>
          </div>
          <div>
            <dt>Payment ID</dt>
            <dd style={{ overflowWrap: "anywhere" }}>{order.razorpayPaymentId}</dd>
          </div>
        </dl>

        <ul className="receipt-items">
          {order.items.map((item) => (
            <li key={item.product}>
              <span>
                {item.name} <span className="muted mono">×{item.quantity}</span>
              </span>
              <span className="dots" aria-hidden="true" />
              <span className="mono">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
          <li className="muted">
            <span>Delivery</span>
            <span className="dots" aria-hidden="true" />
            <span className="mono">₹0</span>
          </li>
        </ul>

        <div className="receipt-total">
          <span>Total paid</span>
          <span className="price">{formatPrice(order.totalAmount)}</span>
        </div>

        <p className="receipt-note">
          Shipping to {address.fullName}, {[address.addressLine1, address.addressLine2, address.city].filter(Boolean).join(", ")} –{" "}
          <span className="mono">{address.pincode}</span>
          <br />
          Paid with Razorpay (Test Mode). Your payment signature was verified by our server.
        </p>
      </div>

      <div className="receipt-actions">
        <Link to={`/orders/${order._id}`} className="btn btn-primary">
          Track this order
        </Link>
        <Link to="/products" className="btn btn-outline">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}

export default OrderSuccess;
