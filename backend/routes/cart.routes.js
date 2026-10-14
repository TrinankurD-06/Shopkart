import { Router } from "express";
import protect from "../middlewares/auth.middleware.js";
import {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
} from "../controllers/cart.controller.js";

const router = Router();

router.use(protect);

router.get("/", getCart);
router.post("/:productId", addToCart);
router.patch("/:productId", updateCartQuantity);
router.delete("/:productId", removeFromCart);

export default router;
