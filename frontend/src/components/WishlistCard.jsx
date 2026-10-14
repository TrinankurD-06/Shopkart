import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { formatPrice, handleImageError, stockLabel } from "../utils/format.js";

function WishlistCard({ product, onRemove }) {
  const { addToCart, isPending } = useCart();
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState({ text: "", ok: true });
  const stock = stockLabel(product.stock);

  const handleRemove = async () => {
    setRemoving(true);
    setMessage({ text: "", ok: true });
    const result = await onRemove(product._id);
    if (!result.ok) {
      setMessage({ text: result.message, ok: false });
      setRemoving(false);
    }
  };

  // "Move to cart" = add one unit to the cart, then take it off the wishlist
  const handleMoveToCart = async () => {
    setMessage({ text: "", ok: true });
    const added = await addToCart(product._id);
    if (!added.ok) {
      setMessage({ text: added.message, ok: false });
      return;
    }
    setRemoving(true);
    await onRemove(product._id);
  };

  return (
    <article className="card product-card">
      <Link to={`/products/${product._id}`} className="card-image">
        <img src={product.image} alt={product.name} loading="lazy" onError={handleImageError} />
      </Link>

      <div className="card-body">
        <span className="tag">{product.category}</span>
        <h3 className="card-title">{product.name}</h3>
        <p className="price">{formatPrice(product.price)}</p>
        <p className={`stock stock-${stock.tone}`}>{stock.text}</p>

        <div className="card-actions">
          <Link to={`/products/${product._id}`} className="btn btn-outline btn-small">
            View Details
          </Link>
          <button type="button" className="btn btn-small btn-wish is-saved" onClick={handleRemove} disabled={removing}>
            {removing ? "Removing..." : "Remove ♥"}
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleMoveToCart}
          disabled={product.stock === 0 || removing || isPending(product._id)}
        >
          {product.stock === 0 ? "Out of Stock" : isPending(product._id) ? "Moving..." : "Move to Cart"}
        </button>
        {message.text && <p className={message.ok ? "field-success" : "field-error"}>{message.text}</p>}
      </div>
    </article>
  );
}

export default WishlistCard;
