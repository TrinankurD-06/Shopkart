import { Router } from "express";
import protect from "../middlewares/auth.middleware.js";
import {
  createPaymentOrder,
  verifyPayment,
  markPaymentFailed,
  getMyOrders,
  getOrderById,
  getReasons,
  cancelMyOrder,
  requestReturn,
  withdrawReturn,
} from "../controllers/order.controller.js";

const router = Router();

// Every order route needs a logged-in user. Fulfilment status changes live in the admin routes.
router.use(protect);

router.post("/create-payment-order", createPaymentOrder);
router.post("/verify-payment", verifyPayment);
router.get("/", getMyOrders);
router.get("/reasons", getReasons); // must come before "/:id"
router.get("/:id", getOrderById);
router.post("/:id/payment-failed", markPaymentFailed);
router.post("/:id/cancel", cancelMyOrder);
router.post("/:id/return", requestReturn);
router.delete("/:id/return", withdrawReturn);

export default router;
