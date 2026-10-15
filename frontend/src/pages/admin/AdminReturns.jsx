import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { AlertTriangle, IndianRupee, Inbox, RotateCcw, Truck } from "lucide-react";
import Loader from "../../components/Loader.jsx";
import StateMessage from "../../components/StateMessage.jsx";
import OrderDrawer from "../../components/admin/OrderDrawer.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchReturns, getErrorMessage, retryRefund, reviewReturn } from "../../services/api.js";
import { RETURN_LABELS, formatCompactPrice, formatPrice, shortId, timeAgo } from "../../utils/format.js";

const VIEWS = [
  { key: "requested", label: "Requests" },
  { key: "approved", label: "Awaiting pickup" },
  { key: "returned", label: "Returned" },
  { key: "rejected", label: "Declined" },
  { key: "refunds", label: "Refunds" },
];

const REFUND_STATUS = { PENDING: "Pending", PROCESSED: "Processed", FAILED: "Failed" };

const EMPTY_TEXT = {
  requested: "No return requests waiting. Customers can request a return for 7 days after delivery.",
  approved: "No approved returns waiting for pickup.",
  returned: "No returns have been received yet.",
  rejected: "No declined returns.",
  refunds: "No refunds yet. Cancelled and returned orders are refunded automatically.",
};

// After-sales desk: review return requests, receive parcels, keep an eye on refunds
function AdminReturns() {
  const { refreshBadges } = useOutletContext();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some((option) => option.key === params.get("view")) ? params.get("view") : "requested";
  const openId = params.get("open");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const setParam = (key, value) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key === "view") next.delete("open");
      return next;
    });

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetchReturns(view)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, "Could not load returns.")))
      .finally(() => setLoading(false));
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshAll = () => {
    load();
    refreshBadges();
  };

  const quick = async (event, order, request, confirmText) => {
    event.stopPropagation();
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(order._id);
    try {
      const result = await request();
      toast({ text: `${shortId(order._id)} · ${result.message}`, tone: result.order.refund?.status === "FAILED" ? "error" : "success" });
      refreshAll();
    } catch (err) {
      toast({ text: getErrorMessage(err), tone: "error" });
    } finally {
      setBusyId(null);
    }
  };

  if (error && !data) {
    return (
      <StateMessage icon={AlertTriangle} tone="error" title="Returns didn't load" text={error}>
        <button type="button" className="btn btn-primary" onClick={load}>
          Try again
        </button>
      </StateMessage>
    );
  }

  if (!data) return <Loader text="Loading returns..." />;

  const { counts, refunds, orders } = data;
  const isRefunds = view === "refunds";

  const actionFor = (order) => {
    const busy = busyId === order._id;
    if (isRefunds) {
      if (order.refund?.status === "FAILED")
        return (
          <button type="button" className="btn btn-outline btn-xs" disabled={busy} onClick={(event) => quick(event, order, () => retryRefund(order._id))}>
            {busy ? "…" : "Retry"}
          </button>
        );
      if (order.refund?.status === "PENDING")
        return (
          <button type="button" className="btn btn-outline btn-xs" disabled={busy} onClick={(event) => quick(event, order, () => retryRefund(order._id))}>
            {busy ? "…" : "Check status"}
          </button>
        );
      return <span className="cell-sub">—</span>;
    }
    if (order.returnRequest?.status === "REQUESTED")
      return (
        <button type="button" className="btn btn-primary btn-xs" disabled={busy} onClick={(event) => quick(event, order, () => reviewReturn(order._id, "approve"))}>
          {busy ? "…" : "Approve"}
        </button>
      );
    if (order.returnRequest?.status === "APPROVED")
      return (
        <button
          type="button"
          className="btn btn-primary btn-xs"
          disabled={busy}
          onClick={(event) =>
            quick(event, order, () => reviewReturn(order._id, "receive"), `Mark ${shortId(order._id)} as received? Items go back into stock and ${formatPrice(order.totalAmount)} is refunded.`)
          }
        >
          {busy ? "…" : "Mark received"}
        </button>
      );
    return <span className="cell-sub">View</span>;
  };

  return (
    <section style={loading ? { opacity: 0.7, transition: "opacity .2s" } : undefined}>
      <div className="admin-head">
        <div>
          <p className="eyebrow">After-sales</p>
          <h1>Returns & refunds</h1>
        </div>
        <p className="muted small" style={{ margin: 0, maxWidth: 380 }}>
          Customers cancel before shipping (refunded instantly) or request a return within 7 days of delivery. Refunds go through Razorpay Test
          Mode.
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">
            <Inbox size={15} /> Waiting for review
          </div>
          <div className="stat-value">{counts.requested}</div>
          <div className="stat-sub">return requests</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <Truck size={15} /> Awaiting pickup
          </div>
          <div className="stat-value">{counts.approved}</div>
          <div className="stat-sub">approved, not yet received</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <IndianRupee size={15} /> Refunded
          </div>
          <div className="stat-value">{formatCompactPrice(refunds.PROCESSED?.amount || 0)}</div>
          <div className="stat-sub">{refunds.PROCESSED?.count || 0} refunds processed</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <RotateCcw size={15} /> Needs attention
          </div>
          <div className="stat-value">{(refunds.FAILED?.count || 0) + (refunds.PENDING?.count || 0)}</div>
          <div className="stat-sub">
            {refunds.FAILED?.count || 0} failed · {refunds.PENDING?.count || 0} pending
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {VIEWS.map((option) => (
          <button key={option.key} type="button" role="tab" aria-selected={view === option.key} className={view === option.key ? "on" : ""} onClick={() => setParam("view", option.key)}>
            {option.label}
            <span className="num">{counts[option.key] || 0}</span>
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <StateMessage icon={RotateCcw} title="Nothing here" text={EMPTY_TEXT[view]} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>{isRefunds ? "For" : "Reason"}</th>
                <th className="r">Amount</th>
                <th>Status</th>
                <th className="r">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="clickable" onClick={() => setParam("open", order._id)}>
                  <td>
                    <strong className="mono">{shortId(order._id)}</strong>
                    <div className="cell-sub">
                      {timeAgo(isRefunds ? order.refund?.initiatedAt || order.updatedAt : order.returnRequest?.requestedAt || order.updatedAt)}
                    </div>
                  </td>
                  <td>
                    {order.user?.fullName || "Deleted account"}
                    <div className="cell-sub">{order.user?.email}</div>
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    {isRefunds ? (
                      <>
                        {order.refund?.reason === "return" ? "Returned order" : "Cancelled order"}
                        <div className="cell-sub">
                          {order.refund?.reason === "return" ? order.returnRequest?.reason : order.cancellation?.reason}
                          {order.cancellation && order.refund?.reason !== "return" ? ` · by ${order.cancellation.by === "customer" ? "customer" : "store"}` : ""}
                        </div>
                      </>
                    ) : (
                      <>
                        {order.returnRequest?.reason}
                        {order.returnRequest?.comment && <div className="cell-sub">“{order.returnRequest.comment}”</div>}
                      </>
                    )}
                  </td>
                  <td className="r mono num">{formatPrice(isRefunds ? order.refund?.amount : order.totalAmount)}</td>
                  <td>
                    {isRefunds ? (
                      <span className={`pill pill-refund-${order.refund?.status.toLowerCase()}`}>{REFUND_STATUS[order.refund?.status]}</span>
                    ) : (
                      <span className={`pill pill-return-${order.returnRequest?.status.toLowerCase()}`}>{RETURN_LABELS[order.returnRequest?.status]}</span>
                    )}
                    {!isRefunds && order.refund && (
                      <div className="cell-sub" style={{ marginTop: 4 }}>
                        Refund {REFUND_STATUS[order.refund.status].toLowerCase()}
                      </div>
                    )}
                  </td>
                  <td className="r">{actionFor(order)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && <OrderDrawer orderId={openId} onClose={() => setParam("open", "")} onUpdated={refreshAll} />}
    </section>
  );
}

export default AdminReturns;
