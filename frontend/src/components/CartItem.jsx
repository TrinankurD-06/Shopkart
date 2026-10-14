import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { formatPrice, handleImageError } from "../utils/format.js";

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
    <div className="cart-item">
      <Link to={`/products/${product._id}`} className="cart-item-image">
        <img src={product.image} alt={product.name} onError={handleImageError} />
      </Link>

      <div className="cart-item-info">
        <Link to={`/products/${product._id}`} className="cart-item-name">
          {product.name}
        </Link>
        <p className="muted">{formatPrice(product.price)} each</p>

        <div className="qty-row">
          <div className="qty-control" aria-busy={pending}>
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => run(() => updateQuantity(product._id, quantity - 1))}
              disabled={pending || quantity <= 1}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => run(() => updateQuantity(product._id, quantity + 1))}
              disabled={pending || quantity >= product.stock}
            >
              +
            </button>
          </div>
          <button type="button" className="link-button" onClick={() => run(() => removeFromCart(product._id))} disabled={pending}>
            {pending ? "Updating..." : "Remove"}
          </button>
        </div>

        {overStock && (
          <p className="field-error">
            {product.stock === 0
              ? "This product is now out of stock. Please remove it."
              : `Only ${product.stock} left now - please reduce the quantity.`}
          </p>
        )}
        {error && <p className="field-error">{error}</p>}
      </div>

      <div className="cart-item-total">{formatPrice(product.price * quantity)}</div>
    </div>
  );
}

export default CartItem;
