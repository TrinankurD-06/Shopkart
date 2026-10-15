import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { AlertTriangle, PackageOpen, Search, X } from "lucide-react";
import Loader from "../../components/Loader.jsx";
import StateMessage from "../../components/StateMessage.jsx";
import OrderTimeline from "../../components/OrderProgress.jsx";
import AddressText from "../../components/AddressText.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchAdminOrder, fetchAdminOrders, getErrorMessage, updateAdminOrderStatus } from "../../services/api.js";
import { formatDate, formatDateTime, formatPrice, handleImageError, shortId, statusLabel, timeAgo } from "../../utils/format.js";

const TABS = ["ALL", "PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

const NEXT = {
  PLACED: { status: "CONFIRMED", label: "Confirm" },
  CONFIRMED: { status: "SHIPPED", label: "Mark shipped" },
  SHIPPED: { status: "DELIVERED", label: "Mark delivered" },
};
const CANCELLABLE = ["PLACED", "CONFIRMED"];

function OrderDrawer({ orderId, onClose, onUpdated }) {
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

  const change = async (status) => {
    if (status === "CANCELLED" && !window.confirm(`Cancel order ${shortId(order._id)}? Its items go back into stock.`)) return;
    setSaving(true);
    try {
      const data = await updateAdminOrderStatus(order._id, status);
      setOrder(data.order);
      onUpdated(data.order);
      toast({ text: `${shortId(order._id)} ${data.message.replace(/^Order /, "")}` });
    } catch (err) {
      toast({ text: getErrorMessage(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const next = order && NEXT[order.status];
  const units = order ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

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
              {(next || CANCELLABLE.includes(order.status)) && (
                <div className="status-actions">
                  {next && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => change(next.status)} disabled={saving}>
                      {saving ? "Saving..." : `${next.label} →`}
                    </button>
                  )}
                  {/* Skipping ahead is allowed; every step in between is still recorded */}
                  {(order.status === "PLACED" || order.status === "CONFIRMED") && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => change("DELIVERED")} disabled={saving} title="Skip ahead - every step in between is recorded">
                      Mark delivered
                    </button>
                  )}
                  {CANCELLABLE.includes(order.status) && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => change("CANCELLED")} disabled={saving}>
                      Cancel order
                    </button>
                  )}
                </div>
              )}
              {!next && !CANCELLABLE.includes(order.status) && (
                <p className="muted small" style={{ margin: 0 }}>
                  {order.status === "DELIVERED" ? "Delivered — nothing left to do." : "Cancelled — stock was returned to inventory."}
                </p>
              )}
            </div>

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

function AdminOrders() {
  const { refreshBadges } = useOutletContext();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("status")) ? params.get("status") : "ALL";
  const openId = params.get("open");

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const setParam = (key, value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: key === "open" ? false : true }
    );

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const request = {};
    if (tab !== "ALL") request.status = tab;
    if (query) request.search = query;
    fetchAdminOrders(request)
      .then((data) => {
        setOrders(data.orders);
        setCounts(data.statusCounts);
      })
      .catch((err) => setError(getErrorMessage(err, "Could not load orders.")))
      .finally(() => setLoading(false));
  }, [tab, query]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the table, tab counts and sidebar badges in step after a change
  const handleUpdated = (updated) => {
    setOrders((list) =>
      list
        .map((order) => (order._id === updated._id ? { ...order, status: updated.status } : order))
        .filter((order) => tab === "ALL" || order.status === tab)
    );
    fetchAdminOrders({}).then((data) => setCounts(data.statusCounts)).catch(() => {});
    refreshBadges();
  };

  const quickAdvance = async (event, order) => {
    event.stopPropagation();
    const next = NEXT[order.status];
    setBusyId(order._id);
    try {
      const data = await updateAdminOrderStatus(order._id, next.status);
      handleUpdated(data.order);
      toast({ text: `${shortId(order._id)} ${data.message.replace(/^Order /, "")}` });
    } catch (err) {
      toast({ text: getErrorMessage(err), tone: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <section>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Fulfilment</p>
          <h1>Orders</h1>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? "on" : ""} onClick={() => setParam("status", name === "ALL" ? "" : name)}>
            {name === "ALL" ? "All" : statusLabel(name)}
            <span className="num">{name === "ALL" ? total : counts[name] || 0}</span>
          </button>
        ))}
      </div>

      <div className="filters">
        <div className="search-input">
          <Search size={16} />
          <input type="search" placeholder="Search customer, email, city or #order" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search orders" />
        </div>
      </div>

      {error ? (
        <StateMessage icon={AlertTriangle} tone="error" title="Orders didn't load" text={error}>
          <button type="button" className="btn btn-primary" onClick={load}>
            Try again
          </button>
        </StateMessage>
      ) : loading && orders.length === 0 ? (
        <Loader text="Loading orders..." />
      ) : orders.length === 0 ? (
        <StateMessage icon={PackageOpen} title="No orders here" text={query ? `Nothing matches “${query}”.` : "Orders in this state will show up here."} />
      ) : (
        <div className="table-wrap" style={loading ? { opacity: 0.6 } : undefined}>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th className="r">Items</th>
                <th>Ship to</th>
                <th className="r">Total</th>
                <th>Status</th>
                <th className="r">Next step</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const next = NEXT[order.status];
                const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={order._id} className="clickable" onClick={() => setParam("open", order._id)}>
                    <td>
                      <strong className="mono">{shortId(order._id)}</strong>
                      <div className="cell-sub">{timeAgo(order.paidAt || order.createdAt)}</div>
                    </td>
                    <td>
                      {order.user?.fullName || "Deleted account"}
                      <div className="cell-sub">{order.user?.email}</div>
                    </td>
                    <td className="r mono num">{units}</td>
                    <td>
                      {order.shippingAddress?.city}
                      <div className="cell-sub">{order.shippingAddress?.state}</div>
                    </td>
                    <td className="r mono num">{formatPrice(order.totalAmount)}</td>
                    <td>
                      <span className={`pill pill-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
                    </td>
                    <td className="r">
                      {next ? (
                        <button type="button" className="btn btn-outline btn-xs" onClick={(event) => quickAdvance(event, order)} disabled={busyId === order._id}>
                          {busyId === order._id ? "Saving..." : next.label}
                        </button>
                      ) : (
                        <span className="cell-sub">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openId && <OrderDrawer orderId={openId} onClose={() => setParam("open", "")} onUpdated={handleUpdated} />}
    </section>
  );
}

export default AdminOrders;
