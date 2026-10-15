import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, MapPin, PackageCheck, Truck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { fetchProducts, fetchWishlist } from "../services/api.js";
import { firstName, formatPrice, handleImageError } from "../utils/format.js";
import ProductCard from "../components/ProductCard.jsx";
import ProductSkeleton from "../components/ProductSkeleton.jsx";

const CATEGORY_ORDER = ["Electronics", "Fashion", "Books", "Home"];

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

function Home() {
  const { user } = useAuth();
  const { itemCount, subtotal } = useCart();
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    fetchProducts({ sort: "popular" })
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));

    fetchWishlist()
      .then((data) => {
        setWishlist(data.wishlist);
        setSavedIds(new Set(data.wishlist.map((product) => product._id)));
      })
      .catch(() => {});
  }, []);

  const handleWishlistChange = useCallback((productId, saved) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  const bestsellers = products.slice(0, 4);
  const heroImages = products.slice(0, 3);

  // One tile per category, using its best-selling product's photo
  const categories = useMemo(
    () =>
      CATEGORY_ORDER.map((name) => {
        const items = products.filter((product) => product.category === name);
        return { name, count: items.length, image: items[0]?.image };
      }).filter((category) => category.count > 0),
    [products]
  );

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">
            {greeting()}, {firstName(user.fullName)}
          </p>
          <h1>
            A small shop of <em>well&#8209;chosen</em> everyday things.
          </h1>
          <p className="hero-lede">
            Headphones you'll actually wear, books worth finishing, a mug for the slow mornings. Twenty products,
            honest prices, free delivery.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-primary btn-lg">
              Shop the catalogue <ArrowRight size={18} />
            </Link>
            <Link to="/products?sort=popular" className="btn btn-outline btn-lg">
              See bestsellers
            </Link>
          </div>
          <div className="hero-facts">
            <div>
              <strong>{products.length || 20}</strong>
              <span>products to choose from</span>
            </div>
            <div>
              <strong>₹0</strong>
              <span>delivery, always</span>
            </div>
            <div>
              <strong>3–5</strong>
              <span>days to your door</span>
            </div>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          {heroImages.map((product, index) => (
            <figure key={product._id} className={`f${index + 1}`}>
              <img src={product.image} alt="" onError={handleImageError} />
            </figure>
          ))}
          {heroImages.length === 0 && <figure className="f1 skeleton" />}
          <div className="hero-sticker">
            free
            <br />
            delivery
          </div>
        </div>
      </section>

      {itemCount > 0 && (
        <div className="welcome-card">
          <div>
            <strong>Your bag is waiting.</strong>
            <div className="small" style={{ opacity: 0.8 }}>
              {itemCount} item{itemCount === 1 ? "" : "s"} · {formatPrice(subtotal)} · items aren't reserved until you pay
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/cart" className="btn btn-outline btn-sm">
              View bag
            </Link>
            <Link to="/checkout" className="btn btn-sm" style={{ background: "#fff", color: "var(--forest-ink)" }}>
              Checkout
            </Link>
          </div>
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Browse</p>
            <h2>Shop by category</h2>
          </div>
          <Link to="/products" className="arrow-link">
            All products <ArrowRight size={16} />
          </Link>
        </div>
        {loading ? (
          <div className="cat-tiles">
            {CATEGORY_ORDER.map((name) => (
              <div key={name} className="cat-tile skeleton" />
            ))}
          </div>
        ) : (
          <div className="cat-tiles">
            {categories.map((category) => (
              <Link key={category.name} to={`/products?category=${category.name}`} className="cat-tile">
                {category.image && <img src={category.image} alt="" loading="lazy" onError={handleImageError} />}
                <span className="cat-tile-label">
                  <strong>{category.name}</strong>
                  <span>{category.count} items</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Most ordered</p>
            <h2>Bestsellers right now</h2>
          </div>
          <Link to="/products?sort=popular" className="arrow-link">
            See all <ArrowRight size={16} />
          </Link>
        </div>
        {loading ? (
          <ProductSkeleton count={4} className="rail" />
        ) : (
          <div className="rail">
            {bestsellers.map((product) => (
              <ProductCard key={product._id} product={product} saved={savedIds.has(product._id)} onWishlistChange={handleWishlistChange} />
            ))}
          </div>
        )}
      </section>

      {wishlist.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">From your wishlist</p>
              <h2>Still thinking about these?</h2>
            </div>
            <Link to="/wishlist" className="arrow-link">
              Open wishlist <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rail">
            {wishlist.slice(0, 4).map((product) => (
              <ProductCard key={product._id} product={product} saved={savedIds.has(product._id)} onWishlistChange={handleWishlistChange} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="promise-strip">
          <div className="promise">
            <Truck size={20} strokeWidth={1.7} />
            <div>
              <strong>Free delivery</strong>
              <span>On every order, no minimum</span>
            </div>
          </div>
          <div className="promise">
            <MapPin size={20} strokeWidth={1.7} />
            <div>
              <strong>Saved addresses</strong>
              <span>Home, work — pick one at checkout</span>
            </div>
          </div>
          <div className="promise">
            <PackageCheck size={20} strokeWidth={1.7} />
            <div>
              <strong>Live order tracking</strong>
              <span>Placed → confirmed → shipped</span>
            </div>
          </div>
          <div className="promise">
            <CreditCard size={20} strokeWidth={1.7} />
            <div>
              <strong>Secure payments</strong>
              <span>Verified by Razorpay signature</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
