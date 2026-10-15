import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CircleSlash, IndianRupee, RotateCcw, Undo2 } from "lucide-react";
import Modal from "./Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { cancelMyOrder, fetchOrderReasons, getErrorMessage, requestReturn, withdrawReturn } from "../services/api.js";
import { REFUND_LABELS, RETURN_LABELS, formatDate, formatDateTime, formatPrice } from "../utils/format.js";

let reasonsCache = null;
const loadReasons = async () => {
  if (!reasonsCache) reasonsCache = await fetchOrderReasons();
  return reasonsCache;
};

function ReasonForm({ kind, order, onDone, onCancel }) {
  const toast = useToast();
  const [reasons, setReasons] = useState([]);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReasons()
      .then((data) => setReasons(kind === "cancel" ? data.cancel : data.return))
      .catch(() => setError("Couldn't load the reasons. Please try again."));
  }, [kind]);

  const submit = async (event) => {
    event.preventDefault();
    if (!reason) return setError("Please choose a reason.");
    setSaving(true);
    setError("");
    try {
      const data = kind === "cancel" ? await cancelMyOrder(order._id, reason) : await requestReturn(order._id, { reason, comment: comment.trim() });
      toast({ text: data.message });
      onDone(data.order);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={saving}>
        <div className="reason-list" role="radiogroup" aria-label="Reason">
          {reasons.map((option) => (
            <label key={option} className={`reason-option ${reason === option ? "on" : ""}`}>
              <input type="radio" name="reason" value={option} checked={reason === option} onChange={() => setReason(option)} />
              {option}
            </label>
          ))}
          {!reasons.length && !error && <p className="muted small">Loading…</p>}
        </div>

        {kind === "return" && (
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="return-comment">
              Anything we should know? <span className="optional">(optional)</span>
            </label>
            <textarea id="return-comment" rows={3} maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="e.g. The handle arrived cracked" />
          </div>
        )}

        <div className="refund-note">
          <IndianRupee size={15} />
          {kind === "cancel" ? (
            <span>
              <strong>{formatPrice(order.totalAmount)}</strong> goes back to your original payment method straight away. Banks usually show it in 5–7
              working days.
            </span>
          ) : (
            <span>
              Once we receive the item, <strong>{formatPrice(order.totalAmount)}</strong> is refunded to your original payment method.
            </span>
          )}
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className={`btn ${kind === "cancel" ? "btn-danger" : "btn-primary"}`} disabled={!reason}>
            {saving ? "Please wait..." : kind === "cancel" ? "Cancel order & refund" : "Request return"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {kind === "cancel" ? "Keep my order" : "Not now"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

// "Need help with this order?" - cancel before shipping, return within the window
export function OrderHelp({ order, onUpdated }) {
  const toast = useToast();
  const [dialog, setDialog] = useState(null); // "cancel" | "return" | null
  const [withdrawing, setWithdrawing] = useState(false);
  const actions = order.actions || {};

  if (!actions.canCancel && !actions.canReturn && !actions.canWithdrawReturn) return null;

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      const data = await withdrawReturn(order._id);
      toast({ text: data.message });
      onUpdated(data.order);
    } catch (err) {
      toast({ text: getErrorMessage(err), tone: "error" });
    } finally {
      setWithdrawing(false);
    }
  };

  const done = (updated) => {
    setDialog(null);
    onUpdated(updated);
  };

  return (
    <div className="panel help-panel">
      <h2 className="panel-title" style={{ marginBottom: 6 }}>
        Need help with this order?
      </h2>
      <p className="muted small" style={{ marginBottom: 16 }}>
        {actions.canCancel && "You can cancel until it ships. You'll get a full refund."}
        {actions.canReturn && actions.returnBy && `You can return it until ${formatDate(actions.returnBy)}.`}
        {actions.canWithdrawReturn && "Your return request is waiting for review. Changed your mind?"}{" "}
        <Link to="/returns" className="link">
          Returns & refunds policy
        </Link>
      </p>
      <div className="form-actions">
        {actions.canCancel && (
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setDialog("cancel")}>
            <CircleSlash size={15} /> Cancel order
          </button>
        )}
        {actions.canReturn && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDialog("return")}>
            <RotateCcw size={15} /> Return order
          </button>
        )}
        {actions.canWithdrawReturn && (
          <button type="button" className="btn btn-outline btn-sm" onClick={withdraw} disabled={withdrawing}>
            <Undo2 size={15} /> {withdrawing ? "Withdrawing..." : "Withdraw return request"}
          </button>
        )}
      </div>

      {dialog && (
        <Modal
          title={dialog === "cancel" ? "Cancel this order?" : "Return this order"}
          subtitle={dialog === "cancel" ? "Tell us why. It helps us improve." : "Pick the reason that fits best. We review returns within 1–2 days."}
          onClose={() => setDialog(null)}
        >
          <ReasonForm kind={dialog} order={order} onDone={done} onCancel={() => setDialog(null)} />
        </Modal>
      )}
    </div>
  );
}

// Where a cancellation / return / refund stands, in plain words for the customer
export function AfterSalesStatus({ order }) {
  const { returnRequest, refund, cancellation } = order;
  if (!returnRequest && !refund && !cancellation) return null;

  const returnCopy = {
    REQUESTED: "We've got your request and will review it within 1–2 days.",
    APPROVED: "Approved. Our courier partner will contact you to collect the item.",
    REJECTED: "We couldn't accept this return.",
    RECEIVED: "We've received the item back.",
  };

  const refundCopy = {
    PENDING: "Your refund is on its way. Banks usually show it in 5–7 working days.",
    PROCESSED: "Your refund has been processed to your original payment method.",
    FAILED: "Your refund is taking longer than usual. Our team is on it, and you don't need to do anything.",
  };

  return (
    <div className="panel">
      <h2 className="panel-title" style={{ marginBottom: 16 }}>
        {refund ? "Refund" : "Return"}
      </h2>
      <dl className="kv">
        {cancellation && (
          <div>
            <dt>Cancelled</dt>
            <dd>
              {formatDate(cancellation.at)} · {cancellation.by === "customer" ? "by you" : "by the store"}
            </dd>
          </div>
        )}
        {returnRequest && (
          <>
            <div>
              <dt>Return</dt>
              <dd>
                <span className={`pill pill-return-${returnRequest.status.toLowerCase()}`}>{RETURN_LABELS[returnRequest.status]}</span>
              </dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{returnRequest.reason}</dd>
            </div>
          </>
        )}
        {refund && (
          <>
            <div>
              <dt>Refund</dt>
              <dd>
                <span className={`pill pill-refund-${refund.status.toLowerCase()}`}>{REFUND_LABELS[refund.status]}</span>
              </dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd className="mono">{formatPrice(refund.amount)}</dd>
            </div>
            {refund.razorpayRefundId && (
              <div>
                <dt>Refund ID</dt>
                <dd className="mono small">{refund.razorpayRefundId}</dd>
              </div>
            )}
            {refund.processedAt && (
              <div>
                <dt>Processed</dt>
                <dd>{formatDateTime(refund.processedAt)}</dd>
              </div>
            )}
          </>
        )}
      </dl>
      {returnRequest && !refund && <p className="small muted" style={{ margin: "14px 0 0" }}>{returnCopy[returnRequest.status]}</p>}
      {returnRequest?.status === "REJECTED" && returnRequest.adminNote && (
        <div className="alert alert-warn" style={{ margin: "12px 0 0" }}>
          <AlertCircle size={16} /> {returnRequest.adminNote}
        </div>
      )}
      {refund && <p className="small muted" style={{ margin: "14px 0 0" }}>{refundCopy[refund.status]}</p>}
      {refund && <p className="field-hint" style={{ marginTop: 6 }}>Razorpay Test Mode: no real money moves.</p>}
    </div>
  );
}
