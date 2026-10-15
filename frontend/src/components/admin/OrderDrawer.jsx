import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import Loader from "../Loader.jsx";
import OrderTimeline from "../OrderProgress.jsx";
import AddressText from "../AddressText.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchAdminOrder, getErrorMessage, retryRefund, reviewReturn, updateAdminOrderStatus } from "../../services/api.js";
import { RETURN_LABELS, formatDate, formatDateTime, formatPrice, handleImageError, shortId, statusLabel } from "../../utils/format.js";

export const NEXT = {
  PLACED: { status: "CONFIRMED", label: "Confirm" },
  CONFIRMED: { status: "SHIPPED", label: "Mark shipped" },
  SHIPPED: { status: "DELIVERED", label: "Mark delivered" },
};
const CANCELLABLE = ["PLACED", "CONFIRMED"];
const REFUND_STATUS = { PENDING: "Pending", PROCESSED: "Processed", FAILED: "Failed" };

function ReturnPanel({ order, busy, run }) {
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const request = order.returnRequest;

  return (
    <div className="panel">
      <div className="panel-head" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Return request</h3>
        <span className={`pill pill-return-${request.status.toLowerCase()}`}>{RETURN_LABELS[request.status]}</span>
      </div>
      <dl className="kv" style={{ marginBottom: 14 }}>
        <div>
          <dt>Reason</dt>
          <dd>{request.reason}</dd>
        </div>
        {request.comment && (
          <div>
            <dt>Customer note</dt>
            <dd>“{request.comment}”</dd>
          </div>
        )}
        <div>
          <dt>Requested</dt>
          <dd>{formatDateTime(request.requestedAt)}</dd>
        </div>
        {request.adminNote && (
          <div>
            <dt>Your note</dt>
            <dd>{request.adminNote}</dd>
          </div>
        )}
      </dl>

      {request.status === "REQUESTED" && !rejecting && (
        <div className="status-actions">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(() => reviewReturn(order._id, "approve"))}>
            Approve & arrange pickup
          </button>
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setRejecting(true)}>
            Decline
          </button>
        </div>
      )}
      {request.status === "REQUESTED" && rejecting && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(() => reviewReturn(order._id, "reject", note.trim()));
          }}
        >
          <div className="field">
            <label htmlFor="reject-note">Note for the customer</label>
            <textarea id="reject-note" rows={2} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. The item shows signs of use" />
          </div>
          <div className="status-actions">
            <button type="submit" className="btn btn-danger btn-sm" disabled={busy || !note.trim()}>
              Decline return
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>
              Back
            </button>
          </div>
        </form>
      )}
      {request.status === "APPROVED" && (
        <div className="status-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => window.confirm("Mark the parcel as received? Items go back into stock and the refund is issued.") && run(() => reviewReturn(order._id, "receive"))}
          >
            Mark received & refund
          </button>
        </div>
      )}
    </div>
  );
}

function RefundPanel({ order, busy, run }) {
  const { refund } = order;
  return (
    <div className="panel">
      <div className="panel-head" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Refund</h3>
        <span className={`pill pill-refund-${refund.status.toLowerCase()}`}>{REFUND_STATUS[refund.status]}</span>
      </div>
      <dl className="kv">
        <div>
          <dt>Amount</dt>
          <dd className="mono">{formatPrice(refund.amount)}</dd>
        </div>
        <div>
          <dt>For</dt>
          <dd>{refund.reason === "return" ? "Returned order" : "Cancelled order"}</dd>
        </div>
        <div>
          <dt>Razorpay refund</dt>
          <dd className="mono small">{refund.razorpayRefundId || "—"}</dd>
        </div>
        <div>
          <dt>Attempts</dt>
          <dd className="mono">{refund.attempts}</dd>
        </div>
        {refund.processedAt && (
          <div>
            <dt>Processed</dt>
            <dd>{formatDateTime(refund.processedAt)}</dd>
          </div>
        )}
      </dl>
      {refund.status === "FAILED" && refund.error && (
        <div className="alert alert-error" style={{ margin: "14px 0 0" }}>
          <AlertCircle size={16} /> {refund.error}
        </div>
      )}
      {refund.status !== "PROCESSED" && (
        <div className="status-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(() => retryRefund(order._id))}>
            {refund.status === "FAILED" ? "Retry refund" : "Check status with Razorpay"}
          </button>
        </div>
      )}
    </div>
  );
}

// Slide-in order details used by the Orders and Returns pages
function OrderDrawer({ orderId, onClose, onUpdated }) {
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    setOrder(null);
    setError("");
    fetchAdminOrder(orderId)
      .then((data) => !ignore && setOrder(data.order))
      .catch((err) => !ignore && setError(getErrorMessage(err, "Could not load this order.")));
    return () => {
      ignore = true;
    };
  }, [orderId]);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Every action returns the updated order
  const run = async (request) => {
    setBusy(true);
    try {
      const data = await request();
      setOrder(data.order);
      onUpdated?.(data.order);
      toast({ text: `${shortId(data.order._id)} · ${data.message}`, tone: data.order.refund?.status === "FAILED" ? "error" : "success" });
    } catch (err) {
      toast({ text: getErrorMessage(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    const reason = window.prompt(`Cancel ${shortId(order._id)}? Items go back into stock and ${formatPrice(order.totalAmount)} is refunded.\n\nReason (shown to the customer):`, "Cancelled by the store");
    if (reason === null) return;
    run(() => updateAdminOrderStatus(order._id, "CANCELLED", reason));
  };

  const next = order && NEXT[order.status];
  const units = order ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const finished = order && !next && !CANCELLABLE.includes(order.status);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Order details">
        <div className="drawer-head">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>
              Order
            </p>
            <strong className="mono" style={{ fontSize: "1.1rem" }}>
              {shortId(orderId)}
            </strong>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="drawer-body">
            <div className="alert alert-error">{error}</div>
          </div>
        )}
        {!order && !error && <Loader text="Loading order..." />}

        {order && (
          <div className="drawer-body">
            <div className="panel">
              <div className="panel-head" style={{ marginBottom: 14 }}>
                <span className={`pill pill-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
                <span className="muted small">Paid {formatDateTime(order.paidAt || order.createdAt)}</span>
              </div>
              {!finished && (
                <div className="status-actions">
                  {next && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => run(() => updateAdminOrderStatus(order._id, next.status))} disabled={busy}>
                      {busy ? "Saving..." : `${next.label} →`}
                    </button>
                  )}
                  {/* Skipping ahead is allowed; every step in between is still recorded */}
                  {CANCELLABLE.includes(order.status) && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => updateAdminOrderStatus(order._id, "DELIVERED"))} disabled={busy} title="Skip ahead - every step in between is recorded">
                      Mark delivered
                    </button>
                  )}
                  {CANCELLABLE.includes(order.status) && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={cancel} disabled={busy}>
                      Cancel & refund
                    </button>
                  )}
                </div>
              )}
              {finished && (
                <p className="muted small" style={{ margin: 0 }}>
                  {order.status === "CANCELLED" &&
                    `Cancelled ${order.cancellation ? `by ${order.cancellation.by === "customer" ? "the customer" : "the store"} · “${order.cancellation.reason}”` : ""}. Stock was returned.`}
                  {order.status === "RETURNED" && "Returned. Stock is back in inventory."}
                  {order.status === "DELIVERED" &&
                    (order.returnRequest ? "Delivered. See the return request below." : "Delivered. The customer can request a return for 7 days.")}
                </p>
              )}
            </div>

            {order.returnRequest && <ReturnPanel order={order} busy={busy} run={run} />}
            {order.refund && <RefundPanel order={order} busy={busy} run={run} />}

            <div className="panel">
              <h3 style={{ marginBottom: 16 }}>Timeline</h3>
              <OrderTimeline order={order} />
            </div>

            <div className="panel">
              <h3 style={{ marginBottom: 12 }}>
                {units} item{units === 1 ? "" : "s"} · <span className="mono">{formatPrice(order.totalAmount)}</span>
              </h3>
              <ul className="order-items">
                {order.items.map((item) => (
                  <li key={item.product} style={{ gridTemplateColumns: "48px 1fr auto" }}>
                    <img src={item.image} alt="" onError={handleImageError} style={{ width: 48 }} />
                    <div>
                      <span>{item.name}</span>
                      <p className="muted small mono" style={{ margin: 0 }}>
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <span className="mono small">{formatPrice(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <h3 style={{ marginBottom: 12 }}>Customer</h3>
              <dl className="kv" style={{ marginBottom: 16 }}>
                <div>
                  <dt>Name</dt>
                  <dd>{order.user?.fullName || "Deleted account"}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{order.user?.email || "—"}</dd>
                </div>
                {order.user?.createdAt && (
                  <div>
                    <dt>Customer since</dt>
                    <dd>{formatDate(order.user.createdAt)}</dd>
                  </div>
                )}
                <div>
                  <dt>Razorpay payment</dt>
                  <dd className="mono small">{order.razorpayPaymentId || "—"}</dd>
                </div>
              </dl>
              <p className="label" style={{ marginBottom: 6 }}>
                Ship to
              </p>
              <address className="address-block">
                <AddressText address={order.shippingAddress} />
              </address>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default OrderDrawer;
