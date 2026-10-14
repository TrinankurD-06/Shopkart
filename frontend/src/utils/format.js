export const formatPrice = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// Last 8 characters of a MongoDB id, e.g. "#3F9A12BC"
export const shortId = (id) => `#${String(id).slice(-8).toUpperCase()}`;

export const stockLabel = (stock) => {
  if (stock === 0) return { text: "Out of stock", tone: "danger" };
  if (stock <= 5) return { text: `Only ${stock} left`, tone: "warn" };
  return { text: `${stock} units left`, tone: "ok" };
};

// Shown if a product image URL fails to load
export const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='#efe9df'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-size='22' fill='#8a7f70'>No image</text></svg>"
  );

export const handleImageError = (event) => {
  if (event.currentTarget.src !== FALLBACK_IMAGE) event.currentTarget.src = FALLBACK_IMAGE;
};
