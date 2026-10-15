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
import adminRoutes from "./routes/admin.routes.js";
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

// Every route lives under /api - the same public path Vercel routes to this service
const api = express.Router();

// Connect lazily so the same app works as a long-running server and as a Vercel function
api.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

api.get("/", (req, res) => {
  res.json({ success: true, message: "ShopKart API is running" });
});

api.use("/customers", customerRoutes);
api.use("/products", productRoutes);
api.use("/wishlist", wishlistRoutes);
api.use("/cart", cartRoutes);
api.use("/orders", orderRoutes);
api.use("/admin", adminRoutes);

app.use("/api", api);

app.use(notFound);
app.use(errorHandler);

// On Vercel the exported app is invoked per request; locally we start a server
if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`ShopKart API listening on http://localhost:${PORT}/api`);
      });
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
      process.exit(1);
    });
}

export default app;
