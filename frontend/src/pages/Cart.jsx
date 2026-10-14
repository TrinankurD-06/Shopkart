import { Link } from "react-router-dom";
import CartItem from "../components/CartItem.jsx";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { useCart } from "../context/CartContext.jsx";
import { formatPrice } from "../utils/format.js";

function Cart() {
  const { cartItems, loading, loaded, error, itemCount, subtotal, refreshCart } = useCart();

  if (loading && !loaded) return <Loader text="Loading your cart..." />;

  if (error && !loaded) {
    return (
      <StateMessage icon="⚠️" tone="error" title="Unable to load your cart." text={error}>
        <button type="button" className="btn btn-primary" onClick={refreshCart}>
          Try Again
        </button>
      </StateMessage>
    );
  }

  if (cartItems.length === 0) {
    return (
      <StateMessage icon="🛒" title="Your cart is empty" text="Looks like you haven't added anything yet.">
        <Link to="/products" className="btn btn-primary">
          Browse Products
        </Link>
      </StateMessage>
    );
  }

  const hasStockProblem = cartItems.some((item) => item.quantity > item.product.stock);

  return (
    <section>
      <div className="page-head">
        <h1>My Cart</h1>
        <Link to="/products" className="btn btn-outline">
          Continue Shopping
        </Link>
      </div>

      <div className="two-col">
        <div className="card cart-list">
          {cartItems.map((item) => (
            <CartItem key={item.product._id} item={item} />
          ))}
        </div>

        <aside className="summary">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Items</span>
            <span>{itemCount}</span>
          </div>
          <div className="summary-total">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {hasStockProblem && <p className="field-error">Fix the stock issues in your cart before checkout.</p>}
          {hasStockProblem ? (
            <button type="button" className="btn btn-primary btn-block" disabled>
              Proceed to Checkout
            </button>
          ) : (
            <Link to="/checkout" className="btn btn-primary btn-block">
              Proceed to Checkout
            </Link>
          )}
          <p className="hint center">Prices are re-checked when you place the order.</p>
        </aside>
      </div>
    </section>
  );
}

export default Cart;
