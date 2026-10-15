import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { LOW_STOCK_FROM, formatPrice, handleImageError } from "../utils/format.js";

function CartItem({ item }) {
  const { updateQuantity, removeFromCart, isPending } = useCart();
  const [error, setError] = useState("");
  const { product, quantity } = item;
  const pending = isPending(product._id);
  const overStock = quantity > product.stock;

  const run = async (action) => {
    setError("");
    const result = await action();
    if (!result.ok) setError(result.message);
  };

  return (
    <div className="line-item" style={pending ? { opacity: 0.6 } : undefined}>
      <Link to={`/products/${product._id}`} className="line-thumb">
        <img src={product.image} alt={product.name} onError={handleImageError} />
      </Link>

      <div>
        <span className="tag">{product.category}</span>
        <Link to={`/products/${product._id}`} className="line-name">
          {product.name}
        </Link>
        <span className="muted small mono">{formatPrice(product.price)} each</span>

        <div className="line-controls">
          <div className="stepper" aria-busy={pending}>
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => run(() => updateQuantity(product._id, quantity - 1))}
              disabled={pending || quantity <= 1}
            >
              <Minus size={14} />
            </button>
            <span aria-live="polite">{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => run(() => updateQuantity(product._id, quantity + 1))}
              disabled={pending || quantity >= product.stock}
            >
              <Plus size={14} />
            </button>
          </div>
          <button type="button" className="link link-danger small" onClick={() => run(() => removeFromCart(product._id))} disabled={pending}>
            Remove
          </button>
        </div>

        {!overStock && product.stock <= LOW_STOCK_FROM && product.stock > 0 && (
          <p className="field-hint" style={{ marginTop: 8, color: "var(--saffron)" }}>
            Few left, selling fast
          </p>
        )}
        {overStock && (
          <p className="field-error" style={{ marginTop: 8 }}>
            {product.stock === 0
              ? "This product just sold out. Please remove it."
              : "Not enough stock for this quantity now. Please reduce it."}
          </p>
        )}
        {error && (
          <p className="field-error" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>

      <div className="line-total price">{formatPrice(product.price * quantity)}</div>
    </div>
  );
}

export default CartItem;
