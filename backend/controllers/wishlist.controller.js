import Customer from "../models/customer.model.js";
import Product from "../models/product.model.js";
import { isValidId } from "../utils/validators.js";

const WISHLIST_FIELDS = "name price category image stock";

// The user always comes from the auth middleware (req.user) - never from the request body or URL.
const isInWishlist = (customer, productId) => customer.wishlist.some((id) => id.equals(productId));

// POST /wishlist/:productId
export const addToWishlist = async (req, res) => {
  const { productId } = req.params;

  if (!isValidId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  if (isInWishlist(req.user, productId)) {
    return res.status(409).json({ success: false, message: "Product is already in your wishlist" });
  }

  // $addToSet guarantees no duplicates even if two requests arrive together
  await Customer.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: product._id } });

  res.status(201).json({ success: true, message: "Product added to wishlist" });
};

// GET /wishlist
export const getWishlist = async (req, res) => {
  const customer = await Customer.findById(req.user._id).populate({
    path: "wishlist",
    select: WISHLIST_FIELDS,
  });

  // A product deleted from the catalogue populates as null - skip it
  const wishlist = customer.wishlist.filter(Boolean);

  res.json({ success: true, count: wishlist.length, wishlist });
};

// DELETE /wishlist/:productId
export const removeFromWishlist = async (req, res) => {
  const { productId } = req.params;

  if (!isValidId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  if (!isInWishlist(req.user, productId)) {
    return res.status(404).json({ success: false, message: "Product is not in your wishlist" });
  }

  req.user.wishlist.pull(productId);
  await req.user.save();

  res.json({ success: true, message: "Product removed from wishlist" });
};

// PATCH /wishlist/:productId/toggle  (bonus)
export const toggleWishlist = async (req, res) => {
  const { productId } = req.params;

  if (!isValidId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  if (isInWishlist(req.user, productId)) {
    req.user.wishlist.pull(productId);
    await req.user.save();
    return res.json({ success: true, saved: false, message: "Product removed from wishlist" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  await Customer.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: product._id } });
  res.json({ success: true, saved: true, message: "Product added to wishlist" });
};
