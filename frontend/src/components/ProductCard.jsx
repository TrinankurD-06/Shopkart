import { Link } from "react-router-dom";
import { formatPrice, handleImageError, stockLabel } from "../utils/format.js";
import WishlistButton from "./WishlistButton.jsx";
import AddToCartButton from "./AddToCartButton.jsx";

function ProductCard({ product, saved, onWishlistChange }) {
  const stock = stockLabel(product.stock);

  return (
    <article className="card product-card">
      <Link to={`/products/${product._id}`} className="card-image">
        <img src={product.image} alt={product.name} loading="lazy" onError={handleImageError} />
        {saved && <span className="saved-heart" title="In your wishlist">♥</span>}
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
          <WishlistButton productId={product._id} saved={saved} onChange={onWishlistChange} />
        </div>
        <AddToCartButton product={product} className="btn-block" />
      </div>
    </article>
  );
}

export default ProductCard;
