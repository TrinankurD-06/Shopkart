import crypto from "crypto";
import Customer from "../models/customer.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import getRazorpay from "../config/razorpay.js";
import { isValidId, validateShippingAddress } from "../utils/validators.js";
import {
  CANCEL_REASONS,
  CANCELLABLE_STATUSES,
  RETURN_REASONS,
  RETURN_WINDOW_DAYS,
  addHistory,
  cancelOrder,
  returnDeadline,
} from "../utils/orderActions.js";

// Compare signatures in constant time to avoid timing attacks
const signaturesMatch = (expected, received) => {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(received), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const markOrderPaid = async (order, userId, paymentId) => {
  order.paymentStatus = "PAID";
  order.status = "PLACED";
  order.razorpayPaymentId = paymentId;
  order.paidAt = new Date();
  order.statusHistory.push({ status: "PLACED", at: order.paidAt });
  await order.save();

  await Product.bulkWrite(
    order.items.map((item) => ({
      updateOne: {
        filter: { _id: item.product, stock: { $gte: item.quantity } },
        update: { $inc: { stock: -item.quantity, sold: item.quantity } },
      },
    }))
  );

  await Customer.updateOne({ _id: userId }, { $set: { cart: [] } });
};

// POST /orders/create-payment-order
// Body: { shippingAddress }. Anything else the client sends (prices, totalAmount...) is ignored.
export const createPaymentOrder = async (req, res) => {
  const { errors, address } = validateShippingAddress(req.body?.shippingAddress);
  if (errors.length) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  // 1. Load the authenticated user's cart with the LATEST product data
  const customer = await Customer.findById(req.user._id).populate("cart.product");
  if (!customer.cart.length) {
    return res.status(400).json({ success: false, message: "Your cart is empty" });
  }

  // 2. Re-verify every item and build the purchase-time snapshot
  const items = [];
  let totalAmount = 0;

  for (const cartItem of customer.cart) {
    const product = cartItem.product;

    if (!product) {
      return res.status(400).json({
        success: false,
        message: "A product in your cart is no longer available. Please remove it and try again.",
      });
    }
    if (cartItem.quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Not enough stock left for ${product.name}. Please reduce the quantity in your bag.`,
      });
    }

    items.push({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: cartItem.quantity,
      image: product.image,
    });
    totalAmount += product.price * cartItem.quantity;
  }

  totalAmount = Math.round(totalAmount * 100) / 100;
  const amountInPaise = Math.round(totalAmount * 100);
  if (amountInPaise < 100) {
    return res.status(400).json({ success: false, message: "The minimum payment amount is ₹1.00" });
  }

  let razorpay;
  try {
    razorpay = getRazorpay();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `${error.message}. Add your Razorpay Test keys to backend/.env.`,
    });
  }

  // 3. Save a pending ShopKart order (the cart is NOT touched yet)
  const order = await Order.create({
    user: req.user._id,
    items,
    shippingAddress: address,
    totalAmount,
  });

  // 4. Create the Razorpay order - amount is in paise (₹1 = 100 paise)
  let razorpayOrder;
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: order._id.toString(),
      notes: { shopKartOrderId: order._id.toString() },
    });
  } catch (error) {
    order.paymentStatus = "FAILED";
    await order.save();
    const reason = error?.error?.description || error.message || "unknown error";
    return res.status(502).json({ success: false, message: `Could not start payment with Razorpay: ${reason}` });
  }

  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  // 5. Only safe checkout data goes back. The Key ID is public; the Key Secret never leaves the server.
  res.status(201).json({
    success: true,
    shopKartOrderId: order._id,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID,
    totalAmount,
  });
};

// POST /orders/verify-payment
export const verifyPayment = async (req, res) => {
  const { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

  if (!shopKartOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Missing payment details" });
  }
  if (!isValidId(shopKartOrderId)) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ success: false, message: "Razorpay keys are not configured on the server" });
  }

  // The order must belong to the logged-in user
  const order = await Order.findOne({ _id: shopKartOrderId, user: req.user._id });
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  // The trusted Razorpay order id is the one WE stored - not whatever the browser sends
  if (!order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id) {
    return res.status(400).json({ success: false, message: "Payment does not belong to this order" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${order.razorpayOrderId}|${razorpay_payment_id}`)
    .digest("hex");

  if (!signaturesMatch(expectedSignature, razorpay_signature)) {
    // Order stays unpaid and the cart is kept
    return res.status(400).json({ success: false, message: "Invalid payment signature" });
  }

  if (order.paymentStatus === "PAID") {
    return res.json({ success: true, message: "Payment already verified", order });
  }

  await markOrderPaid(order, req.user._id, razorpay_payment_id);

  res.json({ success: true, message: "Payment verified. Order placed!", order });
};

// POST /orders/:id/payment-failed  - frontend reports a failed Razorpay attempt
export const markPaymentFailed = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }

  const order = await Order.findOne({ _id: id, user: req.user._id });
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  if (order.paymentStatus === "PAID") {
    return res.status(400).json({ success: false, message: "Order is already paid" });
  }

  order.paymentStatus = "FAILED";
  await order.save();

  res.json({ success: true, message: "Payment marked as failed. Your cart has not been cleared." });
};

// GET /orders  - only the current user's placed (paid) orders, newest first
export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id, status: { $ne: "PENDING_PAYMENT" } })
    .select("items totalAmount status paymentStatus statusHistory shippingAddress.city returnRequest.status refund.status createdAt")
    .sort({ createdAt: -1 });

  res.json({ success: true, count: orders.length, orders });
};

// GET /orders/:id
export const getOrderById = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }

  // Filtering by user means someone else's order simply looks "not found"
  const order = await Order.findOne({ _id: id, user: req.user._id });
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  res.json({ success: true, order: withActions(order) });
};

// What the customer may do next with this order - the UI shows buttons from this
const withActions = (order) => {
  const deadline = returnDeadline(order);
  const paid = order.paymentStatus === "PAID";
  return {
    ...order.toObject(),
    actions: {
      canCancel: paid && CANCELLABLE_STATUSES.includes(order.status),
      canReturn: paid && order.status === "DELIVERED" && !order.returnRequest && deadline > new Date(),
      canWithdrawReturn: order.returnRequest?.status === "REQUESTED",
      returnBy: order.status === "DELIVERED" ? deadline : null,
      returnWindowDays: RETURN_WINDOW_DAYS,
    },
  };
};

const pickReason = (value, allowed) => (typeof value === "string" && allowed.includes(value.trim()) ? value.trim() : "");
const cleanComment = (value) => (typeof value === "string" ? value.trim().slice(0, 500) : "");

const findOwnOrder = async (req, res) => {
  if (!isValidId(req.params.id)) {
    res.status(400).json({ success: false, message: "Invalid order ID" });
    return null;
  }
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) res.status(404).json({ success: false, message: "Order not found" });
  return order;
};

// GET /orders/reasons - the choices shown in the cancel and return forms
export const getReasons = (req, res) => {
  res.json({ success: true, cancel: CANCEL_REASONS, return: RETURN_REASONS, returnWindowDays: RETURN_WINDOW_DAYS });
};

// POST /orders/:id/cancel  body: { reason }
// Customers can cancel until the order ships. Stock goes back and the payment is refunded.
export const cancelMyOrder = async (req, res) => {
  const order = await findOwnOrder(req, res);
  if (!order) return;

  if (order.paymentStatus !== "PAID" || !CANCELLABLE_STATUSES.includes(order.status)) {
    const why = order.status === "SHIPPED" || order.status === "DELIVERED" ? " It has already shipped - you can return it after delivery instead." : "";
    return res.status(400).json({ success: false, message: `This order can no longer be cancelled.${why}` });
  }

  const reason = pickReason(req.body?.reason, CANCEL_REASONS);
  if (!reason) return res.status(400).json({ success: false, message: "Please choose a reason for cancelling" });

  await cancelOrder(order, { by: "customer", reason });

  const refundNote =
    order.refund.status === "FAILED"
      ? "We couldn't start the refund automatically - our team will process it shortly."
      : "Your refund has been started.";
  res.json({ success: true, message: `Order cancelled. ${refundNote}`, order: withActions(order) });
};

// POST /orders/:id/return  body: { reason, comment? }
// Within the return window after delivery. The store then approves or rejects it.
export const requestReturn = async (req, res) => {
  const order = await findOwnOrder(req, res);
  if (!order) return;

  if (order.status !== "DELIVERED") {
    return res.status(400).json({ success: false, message: "Only delivered orders can be returned" });
  }
  if (order.returnRequest) {
    return res.status(409).json({ success: false, message: "A return has already been requested for this order" });
  }
  const deadline = returnDeadline(order);
  if (!deadline || deadline <= new Date()) {
    return res.status(400).json({ success: false, message: `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed` });
  }

  const reason = pickReason(req.body?.reason, RETURN_REASONS);
  if (!reason) return res.status(400).json({ success: false, message: "Please choose a reason for the return" });

  order.returnRequest = { status: "REQUESTED", reason, comment: cleanComment(req.body?.comment), requestedAt: new Date() };
  addHistory(order, "RETURN_REQUESTED");
  await order.save();

  res.status(201).json({ success: true, message: "Return requested. We'll review it within 1–2 days.", order: withActions(order) });
};

// DELETE /orders/:id/return - withdraw a request the store hasn't reviewed yet
export const withdrawReturn = async (req, res) => {
  const order = await findOwnOrder(req, res);
  if (!order) return;

  if (order.returnRequest?.status !== "REQUESTED") {
    return res.status(400).json({ success: false, message: "There is no pending return request to withdraw" });
  }

  order.returnRequest = undefined;
  addHistory(order, "RETURN_WITHDRAWN");
  await order.save();

  res.json({ success: true, message: "Return request withdrawn", order: withActions(order) });
};
