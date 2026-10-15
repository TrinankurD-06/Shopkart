import { ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

// Large "Add to bag" on the product page
function AddToCartButton({ product }) {
  const { addToCart, isPending, quantityOf } = useCart();
  const toast = useToast();

  const pending = isPending(product._id);
  const inCart = quantityOf(product._id);
  const soldOut = product.stock === 0;
  const atLimit = inCart >= product.stock;

  const handleAdd = async () => {
    const result = await addToCart(product._id);
    if (result.ok) toast({ text: `Added “${product.name}” to your bag`, action: { label: "View bag", to: "/cart" } });
    else toast({ text: result.message, tone: "error" });
  };

  let label = inCart ? "Add one more" : "Add to bag";
  if (soldOut) label = "Sold out";
  else if (pending) label = "Adding...";
  else if (atLimit) label = "Maximum already in your bag";

  return (
    <button type="button" className="btn btn-primary btn-lg" onClick={handleAdd} disabled={soldOut || pending || atLimit}>
      {!soldOut && !atLimit && <ShoppingBag size={18} strokeWidth={1.8} />}
      {label}
    </button>
  );
}

export default AddToCartButton;
