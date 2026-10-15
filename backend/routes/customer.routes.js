import { Router } from "express";
import protect from "../middlewares/auth.middleware.js";
import {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  logoutCustomer,
  changePassword,
} from "../controllers/customer.controller.js";
import {
  getAddresses,
  addAddress,
  updateAddress,
  makeDefaultAddress,
  deleteAddress,
} from "../controllers/address.controller.js";

const router = Router();

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.get("/me", protect, getMyProfile);
router.post("/logout", protect, logoutCustomer);
router.patch("/change-password", protect, changePassword);

// Address book
router.get("/addresses", protect, getAddresses);
router.post("/addresses", protect, addAddress);
router.patch("/addresses/:addressId", protect, updateAddress);
router.patch("/addresses/:addressId/default", protect, makeDefaultAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);

export default router;
