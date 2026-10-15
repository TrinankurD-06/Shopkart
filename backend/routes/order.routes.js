import { Router } from "express";
import protect from "../middlewares/auth.middleware.js";
import {
  createPaymentOrder,
  verifyPayment,
  markPaymentFailed,
  getMyOrders,
  getOrderById,
} from "../controllers/order.controller.js";

const router = Router();

// Every order route needs a logged-in user. Status changes live in the admin routes.
router.use(protect);

router.post("/create-payment-order", createPaymentOrder);
router.post("/verify-payment", verifyPayment);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);
router.post("/:id/payment-failed", markPaymentFailed);

export default router;
