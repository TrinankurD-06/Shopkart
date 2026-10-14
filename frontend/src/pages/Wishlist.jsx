import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import WishlistCard from "../components/WishlistCard.jsx";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { fetchWishlist, getErrorMessage, removeFromWishlist } from "../services/api.js";

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

  if (loading) return <Loader text="Loading your wishlist..." />;

  if (error) {
    return (
      <StateMessage icon="⚠️" tone="error" title="Something went wrong." text="We couldn't load your wishlist.">
        <button type="button" className="btn btn-primary" onClick={loadWishlist}>
          Try Again
        </button>
      </StateMessage>
    );
  }

  if (items.length === 0) {
    return (
      <StateMessage icon="❤️" title="Your wishlist is empty" text="Save products you love and find them here later.">
        <Link to="/products" className="btn btn-primary">
          Browse Products
        </Link>
      </StateMessage>
    );
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>My Wishlist</h1>
          <p className="muted">
            {items.length} product{items.length === 1 ? "" : "s"} saved
          </p>
        </div>
        <Link to="/products" className="btn btn-outline">
          Continue Shopping
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
