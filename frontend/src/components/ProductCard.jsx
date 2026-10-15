import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { BESTSELLER_FROM, LOW_STOCK_FROM, formatNumber, formatPrice, handleImageError } from "../utils/format.js";
import WishlistButton from "./WishlistButton.jsx";

export function ProductBadges({ product }) {
  const soldOut = product.stock === 0;
  return (
    <div className="pcard-badges">
      {soldOut && <span className="badge badge-out">Sold out</span>}
      {!soldOut && product.sold >= BESTSELLER_FROM && <span className="badge badge-best">Bestseller</span>}
      {!soldOut && product.stock <= LOW_STOCK_FROM && <span className="badge badge-low">Few left</span>}
    </div>
  );
}

function ProductCard({ product, saved, onWishlistChange }) {
  const { addToCart, isPending, quantityOf } = useCart();
  const toast = useToast();

  const pending = isPending(product._id);
  const inCart = quantityOf(product._id);
  const soldOut = product.stock === 0;
  const atLimit = inCart >= product.stock;

  const handleAdd = async (event) => {
    event.preventDefault();
    const result = await addToCart(product._id);
    if (result.ok) {
      toast({ text: `Added “${product.name}” to your bag`, action: { label: "View bag", to: "/cart" } });
    } else {
      toast({ text: result.message, tone: "error" });
    }
  };

  let quickLabel = (
    <>
      <Plus size={15} /> Add to bag
    </>
  );
  if (soldOut) quickLabel = "Sold out";
  else if (pending) quickLabel = "Adding...";
  else if (atLimit) quickLabel = "Maximum already in your bag";
  else if (inCart)
    quickLabel = (
      <>
        <Check size={15} /> In bag ({inCart}) · add 1 more
      </>
    );

  return (
    <article className={`pcard ${soldOut ? "is-out" : ""}`}>
      <div className="pcard-frame">
        <Link to={`/products/${product._id}`} className="pcard-media" aria-label={product.name}>
          <img src={product.image} alt="" loading="lazy" onError={handleImageError} />
        </Link>
        <ProductBadges product={product} />
        <WishlistButton productId={product._id} productName={product.name} saved={saved} onChange={onWishlistChange} />
        <button
          type="button"
          className={`quick-add ${inCart && !soldOut ? "in-cart" : ""}`}
          onClick={handleAdd}
          disabled={soldOut || pending || atLimit}
        >
          {quickLabel}
        </button>
      </div>

      <div className="pcard-body">
        <span className="tag">{product.category}</span>
        <Link to={`/products/${product._id}`} className="pcard-name">
          {product.name}
        </Link>
        <div className="pcard-foot">
          <span className="price">{formatPrice(product.price)}</span>
          {product.sold > 0 ? (
            <span className="pcard-meta">{formatNumber(product.sold)} sold</span>
          ) : (
            <span className="pcard-meta">New in</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
