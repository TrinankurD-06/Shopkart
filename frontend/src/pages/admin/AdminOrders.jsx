import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { AlertTriangle, PackageOpen, Search } from "lucide-react";
import Loader from "../../components/Loader.jsx";
import StateMessage from "../../components/StateMessage.jsx";
import OrderDrawer, { NEXT } from "../../components/admin/OrderDrawer.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchAdminOrders, getErrorMessage, updateAdminOrderStatus } from "../../services/api.js";
import { RETURN_LABELS, formatPrice, shortId, statusLabel, timeAgo } from "../../utils/format.js";

const TABS = ["ALL", "PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

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
        .map((order) =>
          order._id === updated._id ? { ...order, status: updated.status, returnRequest: updated.returnRequest, refund: updated.refund } : order
        )
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
                      {order.returnRequest && order.status !== "RETURNED" && (
                        <div className="cell-sub" style={{ marginTop: 4 }}>
                          {RETURN_LABELS[order.returnRequest.status]}
                        </div>
                      )}
                      {order.refund?.status === "FAILED" && (
                        <div className="cell-sub" style={{ marginTop: 4, color: "var(--danger)" }}>
                          Refund failed
                        </div>
                      )}
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
