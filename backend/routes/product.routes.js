import { Router } from "express";
import {
  createProduct,
  getProducts,
  getCategories,
  getProductById,
} from "../controllers/product.controller.js";

const router = Router();

// Product creation is an open API for now (as allowed by Lab 03)
router.post("/", createProduct);
router.get("/", getProducts);
router.get("/categories", getCategories); // must come before "/:id"
router.get("/:id", getProductById);

export default router;
