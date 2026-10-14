import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import customerRoutes from "./routes/customer.routes.js";
import productRoutes from "./routes/product.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing. Copy backend/.env.example to backend/.env and fill it in.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5050;
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5180")
  .split(",")
  .map((origin) => origin.trim());

// credentials: true lets the browser send/receive the HttpOnly auth cookie cross-origin
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ success: true, message: "ShopKart API is running" });
});

app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`ShopKart API listening on http://localhost:${PORT}`);
  });
});
