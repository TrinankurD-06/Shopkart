import Customer from "../models/customer.model.js";
import Product from "../models/product.model.js";
import { isValidId } from "../utils/validators.js";

const CART_PRODUCT_FIELDS = "name price category image stock";

const findCartItem = (customer, productId) => customer.cart.find((item) => item.product.equals(productId));

// Every cart endpoint responds with the latest populated cart, so the frontend
// can replace its global cart state in one step. Subtotal is NOT stored - the client derives it.
const sendCart = async (res, customerId, message, status = 200) => {
  const customer = await Customer.findById(customerId).populate({
    path: "cart.product",
    select: CART_PRODUCT_FIELDS,
  });

  // Skip products that were deleted from the catalogue after being added
  const cart = customer.cart
    .filter((item) => item.product)
    .map((item) => ({ product: item.product, quantity: item.quantity }));

  res.status(status).json({ success: true, message, cart });
};

const stockMessage = (product) =>
  product.stock === 0
    ? `${product.name} is out of stock`
    : `Only ${product.stock} unit(s) of ${product.name} available`;

// GET /cart
export const getCart = async (req, res) => {
  await sendCart(res, req.user._id, "Cart loaded");
};

// POST /cart/:productId  - adds 1 unit, or increases the quantity if already in the cart
export const addToCart = async (req, res) => {
  const { productId } = req.params;

  if (!isValidId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const existing = findCartItem(req.user, productId);
  const newQuantity = (existing ? existing.quantity : 0) + 1;

  if (newQuantity > product.stock) {
    return res.status(400).json({ success: false, message: stockMessage(product) });
  }

  if (existing) {
    existing.quantity = newQuantity;
  } else {
    req.user.cart.push({ product: product._id, quantity: 1 });
  }
  await req.user.save();

  await sendCart(res, req.user._id, "Cart updated");
};

// PATCH /cart/:productId   body: { quantity }
export const updateCartQuantity = async (req, res) => {
  const { productId } = req.params;
  const quantity = req.body?.quantity;

  if (!isValidId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const item = findCartItem(req.user, productId);
  if (!item) {
    return res.status(404).json({ success: false, message: "Product is not in your cart" });
  }

  if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
    return res.status(400).json({ success: false, message: "Quantity must be a whole number" });
  }
  if (quantity < 1) {
    return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
  }
  if (quantity > product.stock) {
    return res.status(400).json({ success: false, message: stockMessage(product) });
  }

  item.quantity = quantity;
  await req.user.save();

  await sendCart(res, req.user._id, "Quantity updated");
};

// DELETE /cart/:productId
export const removeFromCart = async (req, res) => {
  const { productId } = req.params;

  if (!isValidId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const item = findCartItem(req.user, productId);
  if (!item) {
    return res.status(404).json({ success: false, message: "Product is not in your cart" });
  }

  req.user.cart = req.user.cart.filter((cartItem) => !cartItem.product.equals(productId));
  await req.user.save();

  await sendCart(res, req.user._id, "Item removed from cart");
};
