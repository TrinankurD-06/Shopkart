import { Router } from "express";
import protect, { adminOnly } from "../middlewares/auth.middleware.js";
import {
  getInventory,
  updateStock,
  getAllOrders,
  getOrderForAdmin,
  updateOrderStatus,
  getAnalytics,
} from "../controllers/admin.controller.js";

const router = Router();

// Every admin route needs a logged-in account with role "admin"
router.use(protect, adminOnly);

router.get("/analytics", getAnalytics);

router.get("/products", getInventory);
router.patch("/products/:id/stock", updateStock);

router.get("/orders", getAllOrders);
router.get("/orders/:id", getOrderForAdmin);
router.patch("/orders/:id/status", updateOrderStatus);

export default router;
