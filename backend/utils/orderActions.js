import Product from "../models/product.model.js";
import getRazorpay from "../config/razorpay.js";

// Shared by the customer and admin controllers so a cancellation or return
// always does the same things in the same order.

export const CANCELLABLE_STATUSES = ["PLACED", "CONFIRMED"]; // before it ships
export const RETURN_WINDOW_DAYS = 7;

export const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery is taking too long",
  "Need to change the delivery address",
  "Other",
];

export const RETURN_REASONS = [
  "Arrived damaged or defective",
  "Received the wrong item",
  "Not as described",
  "No longer needed",
  "Other",
];

const DAY = 24 * 60 * 60 * 1000;

export const addHistory = (order, status, at = new Date()) => {
  order.statusHistory.push({ status, at });
};

export const deliveredAt = (order) =>
  order.statusHistory.find((entry) => entry.status === "DELIVERED")?.at || (order.status === "DELIVERED" ? order.updatedAt : null);

// Last moment a return can be requested, or null if the order wasn't delivered
export const returnDeadline = (order) => {
  const at = deliveredAt(order);
  return at ? new Date(new Date(at).getTime() + RETURN_WINDOW_DAYS * DAY) : null;
};

// Put every item back on the shelf and take it off the "sold" count
export const restock = (order) =>
  Product.bulkWrite(
    order.items.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { stock: item.quantity, sold: -item.quantity } },
      },
    }))
  );

// Razorpay sometimes answers with only a status code, so give the admin something readable
const describeRazorpayError = (error) => {
  if (error?.error?.description) return error.error.description;
  if (error?.statusCode === 404) return "Razorpay couldn't find this payment. It may belong to another Razorpay account.";
  if (error?.statusCode === 401) return "Razorpay rejected the API keys on the server.";
  if (error?.statusCode) return `Razorpay returned an error (HTTP ${error.statusCode}).`;
  return error?.message || "Refund failed";
};

const fromRazorpayStatus =(status) => (status === "processed" ? "PROCESSED" : status === "failed" ? "FAILED" : "PENDING");

// Refund the full amount to the original payment method through Razorpay.
// Never throws: a failure is recorded on the order so the admin can retry it.
// The caller saves the order.
export const refundOrder = async (order, reason) => {
  const existing = order.refund?.status === "FAILED" ? order.refund : null;
  order.refund = {
    status: "PENDING",
    reason: existing?.reason || reason,
    amount: order.totalAmount,
    attempts: (existing?.attempts || 0) + 1,
    initiatedAt: new Date(),
  };

  try {
    if (!order.razorpayPaymentId) throw new Error("This order has no Razorpay payment to refund");
    const refund = await getRazorpay().payments.refund(order.razorpayPaymentId, {
      amount: Math.round(order.totalAmount * 100), // paise
      speed: "normal",
      receipt: `refund_${order._id}`.slice(0, 40),
      notes: { shopKartOrderId: order._id.toString(), reason: order.refund.reason },
    });
    order.refund.razorpayRefundId = refund.id;
    order.refund.status = fromRazorpayStatus(refund.status);
    if (order.refund.status === "PROCESSED") order.refund.processedAt = new Date();
  } catch (error) {
    order.refund.status = "FAILED";
    order.refund.error = describeRazorpayError(error);
  }

  if (order.refund.status === "PROCESSED") addHistory(order, "REFUNDED");
  return order.refund;
};

// Ask Razorpay for the latest state of a pending refund
export const syncRefund = async (order) => {
  if (order.refund?.status !== "PENDING" || !order.refund.razorpayRefundId) return order.refund;
  const refund = await getRazorpay().payments.fetchRefund(order.razorpayPaymentId, order.refund.razorpayRefundId);
  order.refund.status = fromRazorpayStatus(refund.status);
  if (order.refund.status === "PROCESSED") {
    order.refund.processedAt = new Date();
    addHistory(order, "REFUNDED");
  }
  return order.refund;
};

// Cancel a paid order that hasn't shipped: stock back, refund issued
export const cancelOrder = async (order, { by, reason }) => {
  order.status = "CANCELLED";
  order.cancellation = { by, reason, at: new Date() };
  addHistory(order, "CANCELLED");
  await restock(order);
  await refundOrder(order, "cancellation");
  await order.save();
  return order;
};
