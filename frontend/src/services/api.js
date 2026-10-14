import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

// withCredentials: true makes the browser send (and accept) the HttpOnly auth cookie
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// If any protected call returns 401 mid-session (e.g. the cookie expired),
// tell the AuthContext so it can send the user back to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthCall = url.startsWith("/customers/");
    if (error.response?.status === 401 && !isAuthCall) {
      window.dispatchEvent(new Event("shopkart:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.request && !error?.response) return "Cannot reach the ShopKart server. Is the backend running?";
  return fallback;
};

const data = (request) => request.then((response) => response.data);

// ---------- Customers ----------
export const registerCustomer = (customer) => data(api.post("/customers/register", customer));
export const loginCustomer = (credentials) => data(api.post("/customers/login", credentials));
export const getMe = () => data(api.get("/customers/me"));
export const logoutCustomer = () => data(api.post("/customers/logout"));
export const changePassword = (passwords) => data(api.patch("/customers/change-password", passwords));

// ---------- Products ----------
export const fetchProducts = (params) => data(api.get("/products", { params }));
export const fetchCategories = () => data(api.get("/products/categories"));
export const fetchProduct = (id) => data(api.get(`/products/${id}`));

// ---------- Wishlist ----------
export const fetchWishlist = () => data(api.get("/wishlist"));
export const addToWishlist = (productId) => data(api.post(`/wishlist/${productId}`));
export const removeFromWishlist = (productId) => data(api.delete(`/wishlist/${productId}`));
export const toggleWishlist = (productId) => data(api.patch(`/wishlist/${productId}/toggle`));

// ---------- Cart ----------
export const fetchCart = () => data(api.get("/cart"));
export const addCartItem = (productId) => data(api.post(`/cart/${productId}`));
export const updateCartItem = (productId, quantity) => data(api.patch(`/cart/${productId}`, { quantity }));
export const removeCartItem = (productId) => data(api.delete(`/cart/${productId}`));

// ---------- Orders & payment ----------
// Only the shipping address is sent - the server works out items and the total itself
export const createPaymentOrder = (shippingAddress) =>
  data(api.post("/orders/create-payment-order", { shippingAddress }));
export const verifyPayment = (payload) => data(api.post("/orders/verify-payment", payload));
export const reportPaymentFailure = (orderId) => data(api.post(`/orders/${orderId}/payment-failed`));
export const fetchOrders = () => data(api.get("/orders"));
export const fetchOrder = (id) => data(api.get(`/orders/${id}`));
export const advanceOrderStatus = (id, status) => data(api.patch(`/orders/${id}/status`, { status }));

export default api;
