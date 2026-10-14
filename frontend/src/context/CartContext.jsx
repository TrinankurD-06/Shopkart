import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addCartItem,
  fetchCart,
  getErrorMessage,
  removeCartItem,
  updateCartItem,
} from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

const CartContext = createContext(null);

// One shared source of truth for the cart. Navbar, product cards, cart page and
// checkout all read from here, so they can never disagree.
export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id;

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState({}); // per-item loading state

  const refreshCart = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchCart();
      setCartItems(response.cart);
      setLoaded(true);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load your cart."));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the cart when someone logs in; forget it when they log out
  useEffect(() => {
    if (userId) {
      refreshCart();
    } else {
      setCartItems([]);
      setError("");
      setLoaded(false);
    }
  }, [userId, refreshCart]);

  // Every mutation returns the updated cart from the backend, which replaces our state
  const mutate = async (productId, request) => {
    setPendingIds((prev) => ({ ...prev, [productId]: true }));
    try {
      const response = await request();
      setCartItems(response.cart);
      return { ok: true, message: response.message };
    } catch (err) {
      return { ok: false, message: getErrorMessage(err) };
    } finally {
      setPendingIds((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  const addToCart = (productId) => mutate(productId, () => addCartItem(productId));
  const updateQuantity = (productId, quantity) => mutate(productId, () => updateCartItem(productId, quantity));
  const removeFromCart = (productId) => mutate(productId, () => removeCartItem(productId));

  // Called after a verified payment - the backend has already emptied the cart
  const clearCart = useCallback(() => setCartItems([]), []);

  // Derived values - calculated from state, never stored
  const itemCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cartItems]
  );

  const quantityOf = (productId) => cartItems.find((item) => item.product._id === productId)?.quantity || 0;
  const isPending = (productId) => Boolean(pendingIds[productId]);

  const value = {
    cartItems,
    loading,
    loaded,
    error,
    itemCount,
    subtotal,
    refreshCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    quantityOf,
    isPending,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
