import Product from "../models/product.model.js";
import { isValidId } from "../utils/validators.js";

const LIST_FIELDS = "name price category image stock";

const SORT_OPTIONS = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  newest: { createdAt: -1 },
};

// Escape regex special characters so a search like "c++" doesn't break the query
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

// POST /products
export const createProduct = async (req, res) => {
  const body = req.body || {};
  const required = ["name", "description", "price", "category", "image", "stock"];
  const missing = required.filter((field) => isBlank(body[field]));

  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing required field(s): ${missing.join(", ")}` });
  }

  const price = Number(body.price);
  const stock = Number(body.stock);

  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ success: false, message: "Price must be a number greater than 0" });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ success: false, message: "Stock must be a whole number of 0 or more" });
  }

  const product = await Product.create({
    name: String(body.name).trim(),
    description: String(body.description).trim(),
    price,
    category: String(body.category).trim(),
    image: String(body.image).trim(),
    stock,
  });

  res.status(201).json({ success: true, message: "Product created", product });
};

// GET /products?search=&category=&sort=
export const getProducts = async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  const sort = SORT_OPTIONS[req.query.sort] || SORT_OPTIONS.newest;

  // Build the filter dynamically - one endpoint handles every combination
  const filter = {};
  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: "i" };
  }
  if (category && category.toLowerCase() !== "all") {
    filter.category = { $regex: `^${escapeRegex(category)}$`, $options: "i" };
  }

  const products = await Product.find(filter).select(LIST_FIELDS).sort(sort);

  res.json({ success: true, count: products.length, products });
};

// GET /products/categories
export const getCategories = async (req, res) => {
  const categories = await Product.distinct("category");
  res.json({ success: true, categories: categories.sort() });
};

// GET /products/:id
export const getProductById = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  res.json({ success: true, product });
};
