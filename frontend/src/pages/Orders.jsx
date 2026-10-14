import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OrderCard from "../components/OrderCard.jsx";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { fetchOrders } from "../services/api.js";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchOrders();
      setOrders(data.orders);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (loading) return <Loader text="Loading your orders..." />;

  if (error) {
    return (
      <StateMessage icon="⚠️" tone="error" title="Unable to load your orders.">
        <button type="button" className="btn btn-primary" onClick={loadOrders}>
          Try Again
        </button>
      </StateMessage>
    );
  }

  if (orders.length === 0) {
    return (
      <StateMessage icon="📦" title="You have not placed any orders yet.">
        <Link to="/products" className="btn btn-primary">
          Start Shopping
        </Link>
      </StateMessage>
    );
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>My Orders</h1>
          <p className="muted">
            {orders.length} order{orders.length === 1 ? "" : "s"}, newest first
          </p>
        </div>
      </div>
      <div className="order-list">
        {orders.map((order) => (
          <OrderCard key={order._id} order={order} />
        ))}
      </div>
    </section>
  );
}

export default Orders;
