export const formatPrice = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// ₹1.2L / ₹48.3K style, for chart axes and stat tiles
export const formatCompactPrice = (amount) => {
  const value = Number(amount || 0);
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${Math.round(value)}`;
};

export const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

export const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const formatShortDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const timeAgo = (value) => {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
};

// Last 8 characters of a MongoDB id, e.g. "#3F9A12BC"
export const shortId = (id) => `#${String(id).slice(-8).toUpperCase()}`;

export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

export const firstName = (name = "") => name.trim().split(/\s+/)[0] || "";

// Customers only ever see availability, never the exact stock number
export const LOW_STOCK_FROM = 10;

export const stockLabel = (stock) => {
  if (stock === 0) return { text: "Sold out", tone: "danger" };
  if (stock <= LOW_STOCK_FROM) return { text: "Few left", tone: "warn" };
  return { text: "In stock", tone: "ok" };
};

export const BESTSELLER_FROM = 25; // units sold

// Orders usually arrive in 3-5 days; weekends are working days for our couriers
export const deliveryWindow = (from = new Date()) => {
  const add = (days) => {
    const date = new Date(from);
    date.setDate(date.getDate() + days);
    return date;
  };
  const fmt = (date) => date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return { earliest: fmt(add(3)), latest: fmt(add(5)) };
};

export const ORDER_STEPS = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];

export const STATUS_LABELS = {
  PENDING_PAYMENT: "Awaiting payment",
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const statusLabel = (status) => STATUS_LABELS[status] || status;

export const formatAddressLine = (address) =>
  [address.addressLine1, address.addressLine2, address.city].filter(Boolean).join(", ");

// Shown if a product image URL fails to load
export const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500'><rect width='100%' height='100%' fill='#eee7da'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' font-family='Georgia, serif' font-style='italic' font-size='22' fill='#827a6d'>No image</text></svg>"
  );

export const handleImageError = (event) => {
  if (event.currentTarget.src !== FALLBACK_IMAGE) event.currentTarget.src = FALLBACK_IMAGE;
};
