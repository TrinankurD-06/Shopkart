import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, IndianRupee, Package, ShoppingCart, Users } from "lucide-react";
import Loader from "../../components/Loader.jsx";
import StateMessage from "../../components/StateMessage.jsx";
import { fetchAnalytics, getErrorMessage } from "../../services/api.js";
import {
  formatCompactPrice,
  formatNumber,
  formatPrice,
  handleImageError,
  shortId,
  statusLabel,
  timeAgo,
} from "../../utils/format.js";

const RANGES = [7, 14, 30, 90];
const STATUS_ORDER = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

// Round an axis maximum up to 1 / 2 / 5 × 10^n
const niceMax = (value) => {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((multiple) => multiple * power >= value);
  return step * power;
};

const dayLabel = (iso, withWeekday = false) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withWeekday ? { weekday: "short" } : {}),
  });

function Delta({ value, label }) {
  if (value === null || value === undefined) return <span>no orders in the previous {label}</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <>
      <span className={`delta ${up ? "up" : "down"}`}>
        <Icon size={12} />
        {Math.abs(Math.round(value * 100))}%
      </span>
      vs previous {label}
    </>
  );
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="stat">
      <div className="stat-label">
        <Icon size={15} /> {label}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// Single-series column chart: daily revenue. Hover or focus a day for its numbers.
function RevenueChart({ daily }) {
  const [active, setActive] = useState(null);
  const max = niceMax(Math.max(...daily.map((day) => day.revenue)));
  const ticks = [max, max / 2, 0];
  const labelEvery = daily.length <= 7 ? 1 : daily.length <= 14 ? 2 : daily.length <= 30 ? 5 : 15;
  const empty = daily.every((day) => day.revenue === 0);

  return (
    <div className="chart">
      <div className="chart-plot" onMouseLeave={() => setActive(null)}>
        {ticks.map((tick) => (
          <div key={tick} className="chart-grid" style={{ top: `${100 - (tick / max) * 100}%` }}>
            <span className="chart-tick">{formatCompactPrice(tick)}</span>
          </div>
        ))}
        <div className="chart-cols">
          {daily.map((day, index) => {
            const height = (day.revenue / max) * 100;
            return (
              <div
                key={day.date}
                className="chart-col"
                tabIndex={0}
                aria-label={`${dayLabel(day.date)}: ${formatPrice(day.revenue)} from ${day.orders} orders`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              >
                <div className={`bar ${day.revenue === 0 ? "zero" : ""}`} style={{ height: `${height}%` }} />
                {active === index && (
                  <div className="chart-tip" style={{ bottom: `calc(${Math.max(height, 2)}% + 8px)` }}>
                    {dayLabel(day.date, true)}
                    <strong>{formatPrice(day.revenue)}</strong>
                    {day.orders} order{day.orders === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {empty && <div className="chart-empty">No paid orders in this period yet</div>}
      </div>
      <div className="chart-x" aria-hidden="true">
        {daily.map((day, index) => (
          <span key={day.date}>{(daily.length - 1 - index) % labelEvery === 0 ? dayLabel(day.date) : ""}</span>
        ))}
      </div>
    </div>
  );
}

function RevenueTable({ daily }) {
  const rows = daily.filter((day) => day.orders > 0).reverse();
  if (!rows.length) return <p className="muted small">No paid orders in this period yet.</p>;
  return (
    <div className="table-wrap" style={{ maxHeight: 260, overflowY: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Day</th>
            <th className="r">Orders</th>
            <th className="r">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((day) => (
            <tr key={day.date}>
              <td>{dayLabel(day.date, true)}</td>
              <td className="r num mono">{day.orders}</td>
              <td className="r num mono">{formatPrice(day.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Horizontal bars on one scale; the value sits beside the name, never inside the bar
function BarList({ rows, format }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="hbars">
      {rows.map((row) => (
        <li key={row.key} className="hbar">
          <span className="hbar-name" title={row.label}>
            {row.label}
          </span>
          <span className="hbar-value">{format(row.value)}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetchAnalytics(days)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, "Could not load analytics.")))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel = `${days} days`;

  const totalStatus = useMemo(
    () => (data ? Object.values(data.statusCounts).reduce((sum, count) => sum + count, 0) : 0),
    [data]
  );

  if (error && !data) {
    return (
      <StateMessage icon={AlertTriangle} tone="error" title="Analytics didn't load" text={error}>
        <button type="button" className="btn btn-primary" onClick={load}>
          Try again
        </button>
      </StateMessage>
    );
  }

  if (!data) return <Loader text="Crunching the numbers..." />;

  const { summary } = data;

  return (
    <section style={loading ? { opacity: 0.6, transition: "opacity .2s" } : undefined}>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Analytics</h1>
        </div>
        <div className="segmented" role="group" aria-label="Date range">
          {RANGES.map((range) => (
            <button key={range} type="button" className={days === range ? "on" : ""} onClick={() => setDays(range)}>
              {range} days
            </button>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        <Stat icon={IndianRupee} label="Revenue" value={formatPrice(Math.round(summary.revenue))} sub={<Delta value={summary.revenueChange} label={periodLabel} />} />
        <Stat icon={ShoppingCart} label="Paid orders" value={formatNumber(summary.orders)} sub={<Delta value={summary.ordersChange} label={periodLabel} />} />
        <Stat icon={Package} label="Avg. order value" value={formatPrice(Math.round(summary.averageOrderValue))} sub={`${formatPrice(Math.round(summary.allTimeRevenue))} all-time from ${summary.allTimeOrders} orders`} />
        <Stat icon={Users} label="Customers" value={formatNumber(summary.customers)} sub={`${summary.newCustomers} joined in the last ${periodLabel}`} />
      </div>

      <div className="admin-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Revenue</h2>
              <p className="panel-sub">Paid orders per day, excluding cancelled and returned · last {periodLabel}</p>
            </div>
            <button type="button" className="link table-toggle" onClick={() => setShowTable((value) => !value)}>
              {showTable ? "Show chart" : "View as table"}
            </button>
          </div>
          {showTable ? <RevenueTable daily={data.daily} /> : <RevenueChart daily={data.daily} />}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Order pipeline</h2>
              <p className="panel-sub">{totalStatus} paid orders, all time</p>
            </div>
            <Link to="/admin/orders" className="link small">
              Manage
            </Link>
          </div>
          <ul className="status-list">
            {STATUS_ORDER.map((status) => (
              <li key={status}>
                <span className={`pill pill-${status.toLowerCase()}`}>{statusLabel(status)}</span>
                <Link to={`/admin/orders?status=${status}`} className="mono" style={{ textDecoration: "none" }}>
                  {data.statusCounts[status] || 0}
                </Link>
              </li>
            ))}
          </ul>
          <hr className="rule" />
          <dl className="kv">
            <div>
              <dt>Units in stock</dt>
              <dd className="mono">{formatNumber(summary.unitsInStock)}</dd>
            </div>
            <div>
              <dt>Stock value at retail</dt>
              <dd className="mono">{formatCompactPrice(summary.inventoryValue)}</dd>
            </div>
            <div>
              <dt>Units sold, all time</dt>
              <dd className="mono">{formatNumber(summary.unitsSold)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="panel after-sales-strip">
        <div className="panel-head" style={{ marginBottom: 14 }}>
          <div>
            <h2 className="panel-title">After-sales</h2>
            <p className="panel-sub">Cancellations, returns and refunds</p>
          </div>
          <Link to="/admin/returns" className="link small">
            Open returns desk
          </Link>
        </div>
        <div className="mini-stats">
          <Link to="/admin/returns?view=refunds">
            <span>Refunded, all time</span>
            <strong>{formatPrice(Math.round(data.afterSales.refunded))}</strong>
            <small>{data.afterSales.refundedCount} refunds</small>
          </Link>
          <Link to="/admin/returns">
            <span>Returns to handle</span>
            <strong>{data.afterSales.returnsPending}</strong>
            <small>requested or awaiting pickup</small>
          </Link>
          <Link to="/admin/orders?status=CANCELLED">
            <span>Cancelled · last {periodLabel}</span>
            <strong>{data.afterSales.cancelledInPeriod}</strong>
            <small>
              {data.afterSales.returnRequestsInPeriod} return request{data.afterSales.returnRequestsInPeriod === 1 ? "" : "s"} · {data.afterSales.returnedInPeriod} returned
            </small>
          </Link>
          <Link to="/admin/returns?view=refunds" className={data.afterSales.refundsFailed ? "warn" : ""}>
            <span>Refund problems</span>
            <strong>{data.afterSales.refundsFailed + data.afterSales.refundsPending}</strong>
            <small>
              {data.afterSales.refundsFailed} failed · {data.afterSales.refundsPending} pending
            </small>
          </Link>
        </div>
      </div>

      <div className="admin-grid admin-grid-even">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Top products</h2>
              <p className="panel-sub">By units sold, all time</p>
            </div>
          </div>
          <BarList
            rows={data.topProducts.map((product) => ({ key: product._id, label: product.name, value: product.sold }))}
            format={(value) => `${formatNumber(value)} sold`}
          />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Sales by category</h2>
              <p className="panel-sub">Units sold × current price</p>
            </div>
          </div>
          <BarList
            rows={data.categories.map((category) => ({ key: category.category, label: `${category.category} · ${formatNumber(category.sold)} units`, value: category.sales }))}
            format={formatCompactPrice}
          />
        </div>
      </div>

      <div className="admin-grid admin-grid-even">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Running low</h2>
              <p className="panel-sub">20 units or fewer</p>
            </div>
            <Link to="/admin/inventory?level=low" className="link small">
              Restock
            </Link>
          </div>
          {data.lowStock.length === 0 ? (
            <p className="muted small">Everything is well stocked.</p>
          ) : (
            <ul className="mini-list">
              {data.lowStock.map((product) => (
                <li key={product._id}>
                  <img src={product.image} alt="" onError={handleImageError} />
                  <span className="name">{product.name}</span>
                  <span className="mono small" style={{ color: product.stock === 0 ? "var(--danger)" : "var(--saffron)" }}>
                    {product.stock === 0 ? "Sold out" : `${product.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Latest orders</h2>
              <p className="panel-sub">Most recent paid orders</p>
            </div>
            <Link to="/admin/orders" className="link small">
              All orders
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="muted small">No paid orders yet.</p>
          ) : (
            <ul className="mini-list">
              {data.recentOrders.map((order) => (
                <li key={order._id} style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}>
                  <span className="name">
                    <Link to={`/admin/orders?open=${order._id}`} className="mono" style={{ textDecoration: "none" }}>
                      {shortId(order._id)}
                    </Link>{" "}
                    <span className="muted">· {order.user?.fullName || "Deleted customer"} · {timeAgo(order.paidAt || order.createdAt)}</span>
                  </span>
                  <span className={`pill pill-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
                  <span className="mono small">{formatPrice(order.totalAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="field-hint" style={{ marginTop: 8 }}>
        Revenue counts real paid orders, minus cancelled and returned ones (both are refunded). "Units sold" also includes each product's
        opening sales history from the seed data.
      </p>
    </section>
  );
}

export default Analytics;
