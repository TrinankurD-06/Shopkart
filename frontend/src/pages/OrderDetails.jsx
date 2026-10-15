import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, SearchX } from "lucide-react";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import OrderTimeline from "../components/OrderProgress.jsx";
import AddressText, { AddressLabel } from "../components/AddressText.jsx";
import { AfterSalesStatus, OrderHelp } from "../components/OrderAfterSales.jsx";
import { fetchOrder, getErrorMessage } from "../services/api.js";
import { REFUND_LABELS, RETURN_LABELS, formatDateTime, formatPrice, handleImageError, shortId, statusLabel } from "../utils/format.js";

// Customers follow their order here, and can cancel (before shipping) or return it (after delivery).
// Fulfilment status changes happen in the admin panel.
function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

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

  if (error) {
    return (
      <StateMessage icon={SearchX} tone="error" title="Order not found" text={error}>
        <Link to="/orders" className="btn btn-primary">
          Back to my orders
        </Link>
      </StateMessage>
    );
  }

  if (!order) return <Loader text="Loading order..." />;

  const isPaid = order.paymentStatus === "PAID";
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section>
      <Link to="/orders" className="back-link">
        <ArrowLeft size={15} /> All orders
      </Link>

      <div className="page-head">
        <div>
          <p className="eyebrow">Order {shortId(order._id)}</p>
          <h1>{order.status === "CANCELLED" ? "This order was cancelled" : `${statusLabel(order.status)}`}</h1>
          <p className="muted">Placed {formatDateTime(order.paidAt || order.createdAt)}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={`pill pill-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
          {order.returnRequest && order.status !== "RETURNED" && (
            <span className={`pill pill-return-${order.returnRequest.status.toLowerCase()}`}>{RETURN_LABELS[order.returnRequest.status]}</span>
          )}
          {order.refund && <span className={`pill pill-refund-${order.refund.status.toLowerCase()}`}>{REFUND_LABELS[order.refund.status]}</span>}
        </div>
      </div>

      {!isPaid && (
        <div className="alert alert-error">
          <AlertCircle size={16} /> This order was not paid ({order.paymentStatus.toLowerCase()}), so it was never placed.
        </div>
      )}

      <div className="two-col">
        <div className="stack">
          {isPaid && (
            <div className="panel">
              <h2 className="panel-title" style={{ marginBottom: 20 }}>
                Tracking
              </h2>
              <OrderTimeline order={order} />
            </div>
          )}

          {isPaid && <OrderHelp order={order} onUpdated={setOrder} />}
          <AfterSalesStatus order={order} />

          <div className="panel">
            <h2 className="panel-title" style={{ marginBottom: 18 }}>
              {units} item{units === 1 ? "" : "s"}
            </h2>
            <ul className="order-items">
              {order.items.map((item) => (
                <li key={item.product}>
                  <img src={item.image} alt="" onError={handleImageError} />
                  <div>
                    <Link to={`/products/${item.product}`}>{item.name}</Link>
                    <p className="muted small mono" style={{ margin: 0 }}>
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="price">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="field-hint" style={{ marginTop: 12 }}>
              Prices are what you paid at the time of purchase.
            </p>
          </div>
        </div>

        <aside className="summary sticky">
          <h2>Summary</h2>
          <div className="summary-row">
            <span>Items</span>
            <span className="mono">{formatPrice(order.totalAmount)}</span>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <span className="free">Free</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <span className="price">{formatPrice(order.totalAmount)}</span>
          </div>
          <dl className="kv">
            <div>
              <dt>Payment</dt>
              <dd>{order.paymentStatus === "PAID" ? "Paid · Razorpay" : order.paymentStatus}</dd>
            </div>
            {order.razorpayPaymentId && (
              <div>
                <dt>Payment ID</dt>
                <dd className="mono small">{order.razorpayPaymentId}</dd>
              </div>
            )}
          </dl>
          <hr className="rule" />
          <p className="label" style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            Shipping to {order.shippingAddress.label && <AddressLabel label={order.shippingAddress.label} />}
          </p>
          <address className="address-block">
            <AddressText address={order.shippingAddress} />
          </address>
        </aside>
      </div>
    </section>
  );
}

export default OrderDetails;
