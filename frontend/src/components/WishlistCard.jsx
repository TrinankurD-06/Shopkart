import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatPrice, handleImageError, stockLabel } from "../utils/format.js";
import { ProductBadges } from "./ProductCard.jsx";

function WishlistCard({ product, onRemove }) {
  const { addToCart, isPending } = useCart();
  const toast = useToast();
  const [removing, setRemoving] = useState(false);
  const stock = stockLabel(product.stock);
  const soldOut = product.stock === 0;

  const handleRemove = async () => {
    setRemoving(true);
    const result = await onRemove(product._id);
    if (!result.ok) {
      toast({ text: result.message, tone: "error" });
      setRemoving(false);
    }
  };

  // "Move to bag" = add one unit to the cart, then take it off the wishlist
  const handleMove = async () => {
    const added = await addToCart(product._id);
    if (!added.ok) {
      toast({ text: added.message, tone: "error" });
      return;
    }
    setRemoving(true);
    await onRemove(product._id);
    toast({ text: `Moved “${product.name}” to your bag`, action: { label: "View bag", to: "/cart" } });
  };

  return (
    <article className={`pcard ${soldOut ? "is-out" : ""}`} style={removing ? { opacity: 0.5 } : undefined}>
      <div className="pcard-frame">
        <Link to={`/products/${product._id}`} className="pcard-media" aria-label={product.name}>
          <img src={product.image} alt="" loading="lazy" onError={handleImageError} />
        </Link>
        <ProductBadges product={product} />
        <button type="button" className="heart-btn" onClick={handleRemove} disabled={removing} aria-label="Remove from wishlist" title="Remove from wishlist">
          <X size={17} />
        </button>
        <button type="button" className="quick-add in-cart" onClick={handleMove} disabled={soldOut || removing || isPending(product._id)}>
          {soldOut ? (
            "Sold out"
          ) : isPending(product._id) ? (
            "Moving..."
          ) : (
            <>
              Move to bag <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>

      <div className="pcard-body">
        <span className="tag">{product.category}</span>
        <Link to={`/products/${product._id}`} className="pcard-name">
          {product.name}
        </Link>
        <div className="pcard-foot">
          <span className="price">{formatPrice(product.price)}</span>
          <span className={`pcard-meta ${stock.tone !== "ok" ? "warn" : ""}`}>{stock.text}</span>
        </div>
      </div>
    </article>
  );
}

export default WishlistCard;
