import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Heart } from "lucide-react";
import WishlistCard from "../components/WishlistCard.jsx";
import ProductSkeleton from "../components/ProductSkeleton.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { fetchWishlist, getErrorMessage, removeFromWishlist } from "../services/api.js";
import { formatPrice } from "../utils/format.js";

// Wishlist data lives in MongoDB and is fetched here - no global state needed (Lab 04)
function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchWishlist();
      setItems(data.wishlist);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(productId);
      setItems((prev) => prev.filter((product) => product._id !== productId));
      window.dispatchEvent(new Event("wishlist:changed"));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getErrorMessage(err, "Could not remove product.") };
    }
  };

  if (loading) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Saved for later</p>
            <h1>Wishlist</h1>
          </div>
        </div>
        <ProductSkeleton count={4} />
      </section>
    );
  }

  if (error) {
    return (
      <StateMessage icon={AlertTriangle} tone="error" title="We couldn't load your wishlist" text="Check your connection and try again.">
        <button type="button" className="btn btn-primary" onClick={loadWishlist}>
          Try again
        </button>
      </StateMessage>
    );
  }

  if (items.length === 0) {
    return (
      <StateMessage icon={Heart} title="Nothing saved yet" text="Tap the heart on any product to keep it here for later.">
        <Link to="/products" className="btn btn-primary">
          Browse the shop
        </Link>
      </StateMessage>
    );
  }

  const total = items.reduce((sum, product) => sum + product.price, 0);

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Saved for later</p>
          <h1>Wishlist</h1>
          <p className="muted">
            {items.length} item{items.length === 1 ? "" : "s"} · worth <span className="mono">{formatPrice(total)}</span>
          </p>
        </div>
        <Link to="/products" className="btn btn-outline">
          Keep browsing
        </Link>
      </div>

      <div className="product-grid">
        {items.map((product) => (
          <WishlistCard key={product._id} product={product} onRemove={handleRemove} />
        ))}
      </div>
    </section>
  );
}

export default Wishlist;
