import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import WishlistButton from "../components/WishlistButton.jsx";
import AddToCartButton from "../components/AddToCartButton.jsx";
import { useCart } from "../context/CartContext.jsx";
import { fetchProduct, fetchWishlist, getErrorMessage } from "../services/api.js";
import { formatPrice, handleImageError, stockLabel } from "../utils/format.js";

function ProductDetails() {
  const { id } = useParams(); // URL parameter: /products/:id
  const { quantityOf } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    fetchProduct(id)
      .then((data) => !ignore && setProduct(data.product))
      .catch((err) => !ignore && setError({ status: err.response?.status, message: getErrorMessage(err) }))
      .finally(() => !ignore && setLoading(false));

    fetchWishlist()
      .then((data) => !ignore && setSaved(data.wishlist.some((item) => item._id === id)))
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) return <Loader text="Loading product..." />;

  if (error) {
    const notFound = error.status === 404 || error.status === 400;
    return (
      <StateMessage
        icon={notFound ? "🔎" : "⚠️"}
        tone="error"
        title={notFound ? "Product not found" : "Something went wrong"}
        text={error.message}
      >
        <Link to="/products" className="btn btn-primary">
          Back to Products
        </Link>
      </StateMessage>
    );
  }

  const stock = stockLabel(product.stock);
  const inCart = quantityOf(product._id);

  return (
    <section>
      <Link to="/products" className="back-link">
        ← Back to Products
      </Link>

      <div className="details">
        <div className="details-image">
          <img src={product.image} alt={product.name} onError={handleImageError} />
        </div>

        <div className="details-info">
          <span className="tag">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="details-price">{formatPrice(product.price)}</p>
          <p className={`stock stock-${stock.tone}`}>{stock.text}</p>
          <p className="details-description">{product.description}</p>

          <div className="details-actions">
            <AddToCartButton product={product} />
            <WishlistButton productId={product._id} saved={saved} onChange={(_, value) => setSaved(value)} />
          </div>

          {inCart > 0 && (
            <p className="muted">
              You have {inCart} in your cart. <Link to="/cart">Go to cart →</Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default ProductDetails;
