import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Lock, ShoppingBag, Truck } from "lucide-react";
import CartItem from "../components/CartItem.jsx";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAddresses } from "../context/AddressContext.jsx";
import { deliveryWindow, formatPrice } from "../utils/format.js";

function Cart() {
  const { cartItems, loading, loaded, error, itemCount, subtotal, refreshCart } = useCart();
  const { defaultAddress } = useAddresses();

  if (loading && !loaded) return <Loader text="Loading your bag..." />;

  if (error && !loaded) {
    return (
      <StateMessage icon={AlertTriangle} tone="error" title="We couldn't load your bag" text={error}>
        <button type="button" className="btn btn-primary" onClick={refreshCart}>
          Try again
        </button>
      </StateMessage>
    );
  }

  if (cartItems.length === 0) {
    return (
      <StateMessage icon={ShoppingBag} title="Your bag is empty" text="Good things are a click away — the bestsellers are a fine place to start.">
        <Link to="/products?sort=popular" className="btn btn-primary">
          See bestsellers
        </Link>
        <Link to="/wishlist" className="btn btn-outline">
          Open wishlist
        </Link>
      </StateMessage>
    );
  }

  const hasStockProblem = cartItems.some((item) => item.quantity > item.product.stock);
  const { earliest, latest } = deliveryWindow();

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Step 1 of 3</p>
          <h1>Your bag</h1>
          <p className="muted">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </p>
        </div>
        <Link to="/products" className="btn btn-outline">
          Continue shopping
        </Link>
      </div>

      <div className="two-col">
        <div className="bag-list">
          {cartItems.map((item) => (
            <CartItem key={item.product._id} item={item} />
          ))}
          <p className="small muted" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 18 }}>
            <Truck size={16} /> Arrives {earliest} – {latest}
            {defaultAddress ? ` to ${defaultAddress.city}` : ""}
          </p>
        </div>

        <aside className="summary sticky">
          <h2>Summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span className="mono">{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <span className="free">Free</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <span className="price">{formatPrice(subtotal)}</span>
          </div>
          {hasStockProblem && (
            <div className="alert alert-warn">
              <AlertTriangle size={16} /> Some items aren't available in that quantity any more. Adjust them to continue.
            </div>
          )}
          {hasStockProblem ? (
            <button type="button" className="btn btn-primary btn-block btn-lg" disabled>
              Checkout
            </button>
          ) : (
            <Link to="/checkout" className="btn btn-primary btn-block btn-lg">
              Checkout <ArrowRight size={18} />
            </Link>
          )}
          <p className="secure-note">
            <Lock size={13} /> Prices and stock are re-checked when you pay
          </p>
        </aside>
      </div>
    </section>
  );
}

export default Cart;
