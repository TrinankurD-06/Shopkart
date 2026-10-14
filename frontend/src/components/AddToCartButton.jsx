import { useState } from "react";
import { useCart } from "../context/CartContext.jsx";

function AddToCartButton({ product, className = "" }) {
  const { addToCart, isPending, quantityOf } = useCart();
  const [message, setMessage] = useState({ text: "", ok: true });

  const pending = isPending(product._id);
  const inCart = quantityOf(product._id);
  const outOfStock = product.stock === 0;
  const reachedLimit = inCart >= product.stock;

  const handleAdd = async () => {
    setMessage({ text: "", ok: true });
    const result = await addToCart(product._id);
    setMessage({ text: result.ok ? "Added to cart" : result.message, ok: result.ok });
  };

  let label = "Add to Cart";
  if (outOfStock) label = "Out of Stock";
  else if (pending) label = "Adding...";
  else if (reachedLimit) label = "Max stock in cart";
  else if (inCart) label = `Add Another (${inCart} in cart)`;

  return (
    <div className="cart-action">
      <button
        type="button"
        className={`btn btn-primary ${className}`}
        onClick={handleAdd}
        disabled={outOfStock || pending || reachedLimit}
      >
        {label}
      </button>
      {message.text && <p className={message.ok ? "field-success" : "field-error"}>{message.text}</p>}
    </div>
  );
}

export default AddToCartButton;
