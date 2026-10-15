import axios from "axios";

// Same-origin by default: Vercel routes /api to the backend, and the Vite dev server proxies it
export const API_URL = import.meta.env.VITE_API_URL || "/api";

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

// ---------- Sign in with Google (OAuth 2.0) ----------
export const fetchAuthProviders = () => data(api.get("/auth/providers"));

// ---------- Address book ----------
export const fetchAddresses = () => data(api.get("/customers/addresses"));
export const createAddress = (address) => data(api.post("/customers/addresses", address));
export const editAddress = (id, address) => data(api.patch(`/customers/addresses/${id}`, address));
export const makeDefaultAddress = (id) => data(api.patch(`/customers/addresses/${id}/default`));
export const deleteAddress = (id) => data(api.delete(`/customers/addresses/${id}`));

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

// ---------- Cancel / return ----------
export const fetchOrderReasons = () => data(api.get("/orders/reasons"));
export const cancelMyOrder = (id, reason) => data(api.post(`/orders/${id}/cancel`, { reason }));
export const requestReturn = (id, payload) => data(api.post(`/orders/${id}/return`, payload));
export const withdrawReturn = (id) => data(api.delete(`/orders/${id}/return`));

// ---------- Admin ----------
export const fetchAnalytics = (days) => data(api.get("/admin/analytics", { params: { days } }));
export const fetchInventory = (params) => data(api.get("/admin/products", { params }));
export const updateStock = (id, stock) => data(api.patch(`/admin/products/${id}/stock`, { stock }));
export const fetchAdminOrders = (params) => data(api.get("/admin/orders", { params }));
export const fetchAdminOrder = (id) => data(api.get(`/admin/orders/${id}`));
export const updateAdminOrderStatus = (id, status, reason) => data(api.patch(`/admin/orders/${id}/status`, { status, reason }));
export const reviewReturn = (id, action, note) => data(api.patch(`/admin/orders/${id}/return`, { action, note }));
export const retryRefund = (id) => data(api.post(`/admin/orders/${id}/refund`));
export const fetchReturns = (view) => data(api.get("/admin/returns", { params: { view } }));

export default api;
