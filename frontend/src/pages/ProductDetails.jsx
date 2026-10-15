import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ChevronRight, MapPin, SearchX, ShieldCheck, Truck } from "lucide-react";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import WishlistButton from "../components/WishlistButton.jsx";
import AddToCartButton from "../components/AddToCartButton.jsx";
import ProductCard, { ProductBadges } from "../components/ProductCard.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAddresses } from "../context/AddressContext.jsx";
import { fetchProduct, fetchProducts, fetchWishlist, getErrorMessage } from "../services/api.js";
import { BESTSELLER_FROM, deliveryWindow, formatNumber, formatPrice, handleImageError, stockLabel } from "../utils/format.js";

// Availability only - the exact stock number stays in the admin panel
function Availability({ stock, sold }) {
  const { tone } = stockLabel(stock);
  let note = "In stock, ready to ship";
  if (tone === "danger") note = "Sold out — check back soon";
  else if (tone === "warn") note = "Few left — selling fast";

  return (
    <p className={`availability ${tone}`}>
      <span className="availability-dot" aria-hidden="true" />
      {note}
      {sold > 0 && <span className="muted mono small"> · {formatNumber(sold)} sold</span>}
    </p>
  );
}

function ProductDetails() {
  const { id } = useParams(); // URL parameter: /products/:id
  const { quantityOf } = useCart();
  const { defaultAddress } = useAddresses();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    setRelated([]);

    fetchProduct(id)
      .then((data) => {
        if (ignore) return;
        setProduct(data.product);
        // "More from this category"
        fetchProducts({ category: data.product.category, sort: "popular" })
          .then((list) => !ignore && setRelated(list.products.filter((item) => item._id !== id).slice(0, 4)))
          .catch(() => {});
      })
      .catch((err) => !ignore && setError({ status: err.response?.status, message: getErrorMessage(err) }))
      .finally(() => !ignore && setLoading(false));

    fetchWishlist()
      .then((data) => !ignore && setSavedIds(new Set(data.wishlist.map((item) => item._id))))
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleWishlistChange = useCallback((productId, saved) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  if (loading) return <Loader text="Loading product..." />;

  if (error) {
    const notFound = error.status === 404 || error.status === 400;
    return (
      <StateMessage icon={notFound ? SearchX : AlertTriangle} tone="error" title={notFound ? "Product not found" : "Something went wrong"} text={error.message}>
        <Link to="/products" className="btn btn-primary">
          Back to the shop
        </Link>
      </StateMessage>
    );
  }

  const inCart = quantityOf(product._id);
  const { earliest, latest } = deliveryWindow();

  return (
    <section>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/products">Shop</Link>
        <ChevronRight size={13} />
        <Link to={`/products?category=${product.category}`}>{product.category}</Link>
        <ChevronRight size={13} />
        <span>{product.name}</span>
      </nav>

      <div className="pdp">
        <div className="pdp-media">
          <img src={product.image} alt={product.name} onError={handleImageError} />
          <ProductBadges product={product} />
        </div>

        <div className="pdp-info">
          <span className="tag">{product.category}</span>
          <h1>{product.name}</h1>
          <div className="pdp-price">
            <span className="price">{formatPrice(product.price)}</span>
            <span className="muted small">Inclusive of all taxes</span>
          </div>
          {product.sold >= BESTSELLER_FROM && (
            <p className="small" style={{ color: "var(--forest)", margin: "6px 0 0" }}>
              One of our most ordered products
            </p>
          )}

          <Availability stock={product.stock} sold={product.sold || 0} />

          <div className="pdp-actions">
            <AddToCartButton product={product} />
            <WishlistButton
              variant="button"
              productId={product._id}
              productName={product.name}
              saved={savedIds.has(product._id)}
              onChange={handleWishlistChange}
            />
          </div>

          {inCart > 0 && (
            <p className="small" style={{ marginTop: 12 }}>
              <span className="muted">You have {inCart} in your bag · </span>
              <Link to="/cart" className="link">
                Go to bag
              </Link>
            </p>
          )}

          <div className="deliver-box">
            <div className="deliver-row">
              <MapPin size={18} strokeWidth={1.8} />
              {defaultAddress ? (
                <p>
                  Delivering to <strong>{defaultAddress.city}</strong> <span className="mono">{defaultAddress.pincode}</span>{" "}
                  <Link to="/account#addresses" className="link small">
                    Change
                  </Link>
                </p>
              ) : (
                <p>
                  <Link to="/account#addresses" className="link">
                    Add a delivery address
                  </Link>{" "}
                  <span className="muted">to see when it reaches you</span>
                </p>
              )}
            </div>
            <div className="deliver-row">
              <Truck size={18} strokeWidth={1.8} />
              <p>
                <strong>Free delivery</strong> between {earliest} and {latest}
              </p>
            </div>
            <div className="deliver-row">
              <ShieldCheck size={18} strokeWidth={1.8} />
              <p>Secure checkout with Razorpay · Test Mode, nothing is charged</p>
            </div>
          </div>

          <p className="pdp-desc">{product.description}</p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">You may also like</p>
              <h2>More from {product.category}</h2>
            </div>
          </div>
          <div className="rail">
            {related.map((item) => (
              <ProductCard key={item._id} product={item} saved={savedIds.has(item._id)} onWishlistChange={handleWishlistChange} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

export default ProductDetails;
