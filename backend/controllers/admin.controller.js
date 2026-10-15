import Customer from "../models/customer.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { isValidId } from "../utils/validators.js";
import { CANCELLABLE_STATUSES, addHistory, cancelOrder, refundOrder, restock, syncRefund } from "../utils/orderActions.js";

const STATUS_FLOW = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];
const ADMIN_ORDER_USER_FIELDS = "fullName email phone createdAt";
const MAX_STOCK = 100000;
const TIMEZONE = "Asia/Kolkata";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- Inventory ----------

// GET /admin/products?search=&category=&level=low|out
export const getInventory = async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  const level = req.query.level;

  const filter = {};
  if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };
  if (category) filter.category = category;
  if (level === "out") filter.stock = 0;
  if (level === "low") filter.stock = { $gt: 0, $lte: 20 };

  const products = await Product.find(filter)
    .select("name category price image stock sold updatedAt")
    .sort({ category: 1, name: 1 });

  res.json({ success: true, count: products.length, products });
};

// PATCH /admin/products/:id/stock  body: { stock }
export const updateStock = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const stock = Number(req.body?.stock);
  if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
    return res.status(400).json({
      success: false,
      message: `Stock must be a whole number from 0 to ${MAX_STOCK.toLocaleString("en-IN")}`,
    });
  }

  const product = await Product.findByIdAndUpdate(id, { stock }, { new: true, runValidators: true }).select(
    "name category price image stock sold updatedAt"
  );
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  res.json({ success: true, message: `${product.name} stock set to ${stock}`, product });
};

// ---------- Orders ----------

// GET /admin/orders?status=&search=
export const getAllOrders = async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "";
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  // Unpaid checkout attempts never became orders, so they are left out
  const filter = { paymentStatus: "PAID" };
  if ([...STATUS_FLOW, "CANCELLED", "RETURNED"].includes(status)) filter.status = status;

  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: "i" };
    const customers = await Customer.find({ $or: [{ fullName: pattern }, { email: pattern }] }).select("_id");
    const or = [{ user: { $in: customers.map((c) => c._id) } }, { "shippingAddress.city": pattern }];
    // Allow searching by the short order id shown in the UI (last 8 characters)
    const idFragment = search.replace(/^#/, "").toLowerCase();
    if (/^[0-9a-f]{4,24}$/.test(idFragment)) {
      or.push({ $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: `${idFragment}$` } } });
    }
    filter.$or = or;
  }

  const orders = await Order.find(filter)
    .populate("user", "fullName email")
    .select("user items totalAmount status paymentStatus shippingAddress.city shippingAddress.state returnRequest.status refund.status paidAt createdAt")
    .sort({ createdAt: -1 })
    .limit(200);

  const counts = await Order.aggregate([
    { $match: { paymentStatus: "PAID" } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    count: orders.length,
    orders,
    statusCounts: Object.fromEntries(counts.map((row) => [row._id, row.count])),
  });
};

// GET /admin/orders/:id
export const getOrderForAdmin = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }

  const order = await Order.findById(id).populate("user", ADMIN_ORDER_USER_FIELDS);
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  res.json({ success: true, order });
};

const loadOrder = async (req, res) => {
  if (!isValidId(req.params.id)) {
    res.status(400).json({ success: false, message: "Invalid order ID" });
    return null;
  }
  const order = await Order.findById(req.params.id);
  if (!order) res.status(404).json({ success: false, message: "Order not found" });
  return order;
};

const sendOrder = async (res, order, message) => {
  await order.populate("user", ADMIN_ORDER_USER_FIELDS);
  res.json({ success: true, message, order });
};

// PATCH /admin/orders/:id/status  body: { status, reason? }
// Orders move forward one way (PLACED -> CONFIRMED -> SHIPPED -> DELIVERED).
// PLACED or CONFIRMED orders can be CANCELLED: stock goes back and the payment is refunded.
export const updateOrderStatus = async (req, res) => {
  const nextStatus = typeof req.body?.status === "string" ? req.body.status.toUpperCase() : "";
  const order = await loadOrder(req, res);
  if (!order) return;

  if (order.paymentStatus !== "PAID") {
    return res.status(400).json({ success: false, message: "Only paid orders can be updated" });
  }

  if (nextStatus === "CANCELLED") {
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `A ${order.status.toLowerCase()} order can no longer be cancelled`,
      });
    }
    const reason =
      typeof req.body?.reason === "string" && req.body.reason.trim() ? req.body.reason.trim().slice(0, 200) : "Cancelled by the store";
    await cancelOrder(order, { by: "admin", reason });
    const refundNote = order.refund.status === "FAILED" ? " The refund failed - retry it from the order." : " Refund started.";
    return sendOrder(res, order, `Order cancelled.${refundNote}`);
  }

  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextIndex = STATUS_FLOW.indexOf(nextStatus);
  if (currentIndex === -1 || nextIndex === -1 || nextIndex <= currentIndex) {
    const allowed = currentIndex === -1 ? [] : STATUS_FLOW.slice(currentIndex + 1);
    return res.status(400).json({
      success: false,
      message: `Status must move forward from ${order.status} (allowed: ${allowed.join(", ") || "none"})`,
    });
  }

  // Skipping ahead (e.g. PLACED -> SHIPPED) still records every step in between
  for (const step of STATUS_FLOW.slice(currentIndex + 1, nextIndex + 1)) addHistory(order, step);
  order.status = nextStatus;
  await order.save();

  sendOrder(res, order, `Order marked as ${nextStatus.toLowerCase()}`);
};

// PATCH /admin/orders/:id/return  body: { action: "approve" | "reject" | "receive", note? }
//   approve: REQUESTED -> APPROVED (arrange the pickup)
//   reject:  REQUESTED -> REJECTED (a note for the customer is required)
//   receive: APPROVED  -> RECEIVED (order becomes RETURNED, stock goes back, refund issued)
export const reviewReturn = async (req, res) => {
  const action = req.body?.action;
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 300) : "";
  const order = await loadOrder(req, res);
  if (!order) return;

  const current = order.returnRequest?.status;
  if (!current) return res.status(400).json({ success: false, message: "This order has no return request" });

  if (action === "approve" || action === "reject") {
    if (current !== "REQUESTED") {
      return res.status(400).json({ success: false, message: `This return was already ${current.toLowerCase()}` });
    }
    if (action === "reject" && !note) {
      return res.status(400).json({ success: false, message: "Add a short note telling the customer why" });
    }
    order.returnRequest.status = action === "approve" ? "APPROVED" : "REJECTED";
    order.returnRequest.decidedAt = new Date();
    if (note) order.returnRequest.adminNote = note;
    addHistory(order, action === "approve" ? "RETURN_APPROVED" : "RETURN_REJECTED");
    await order.save();
    return sendOrder(res, order, action === "approve" ? "Return approved - arrange the pickup" : "Return rejected");
  }

  if (action === "receive") {
    if (current !== "APPROVED") {
      return res.status(400).json({ success: false, message: "Approve the return before marking it received" });
    }
    order.returnRequest.status = "RECEIVED";
    order.returnRequest.receivedAt = new Date();
    if (note) order.returnRequest.adminNote = note;
    order.status = "RETURNED";
    addHistory(order, "RETURNED");
    await restock(order);
    await refundOrder(order, "return");
    await order.save();
    const refundNote = order.refund.status === "FAILED" ? " The refund failed - retry it." : " Refund started.";
    return sendOrder(res, order, `Return received, items back in stock.${refundNote}`);
  }

  res.status(400).json({ success: false, message: 'Action must be "approve", "reject" or "receive"' });
};

// POST /admin/orders/:id/refund - retry a failed refund, or re-check a pending one with Razorpay
export const retryRefund = async (req, res) => {
  const order = await loadOrder(req, res);
  if (!order) return;

  const status = order.refund?.status;
  if (status === "FAILED") {
    await refundOrder(order, order.refund.reason);
  } else if (status === "PENDING") {
    try {
      await syncRefund(order);
    } catch (error) {
      return res.status(502).json({ success: false, message: `Razorpay: ${error?.error?.description || error.message}` });
    }
  } else {
    return res.status(400).json({ success: false, message: status ? "This refund is already processed" : "This order has no refund" });
  }

  await order.save();
  sendOrder(res, order, `Refund ${order.refund.status.toLowerCase()}`);
};

// GET /admin/returns?view=requested|approved|returned|rejected|refunds
// Everything that needs after-sales attention, plus counts for the tabs
const RETURN_VIEWS = {
  requested: { "returnRequest.status": "REQUESTED" },
  approved: { "returnRequest.status": "APPROVED" },
  returned: { "returnRequest.status": "RECEIVED" },
  rejected: { "returnRequest.status": "REJECTED" },
  refunds: { refund: { $exists: true } },
};

export const getReturns = async (req, res) => {
  const view = RETURN_VIEWS[req.query.view] ? req.query.view : "requested";

  const [orders, counts, refundTotals] = await Promise.all([
    Order.find(RETURN_VIEWS[view])
      .populate("user", "fullName email")
      .select("user items totalAmount status returnRequest refund cancellation shippingAddress.city paidAt createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(200),
    Promise.all(Object.entries(RETURN_VIEWS).map(async ([key, filter]) => [key, await Order.countDocuments(filter)])),
    Order.aggregate([
      { $match: { refund: { $exists: true } } },
      { $group: { _id: "$refund.status", amount: { $sum: "$refund.amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    view,
    orders,
    counts: Object.fromEntries(counts),
    refunds: Object.fromEntries(refundTotals.map((row) => [row._id, { amount: row.amount, count: row.count }])),
  });
};

// ---------- Analytics ----------

const dayKey = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

// GET /admin/analytics?days=30
export const getAnalytics = async (req, res) => {
  const days = [7, 14, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);

  // Revenue counts every paid order that was not cancelled or returned (both are refunded)
  const earning = { paymentStatus: "PAID", status: { $nin: ["CANCELLED", "RETURNED"] } };

  const sumBetween = async (from, to) => {
    const [row] = await Order.aggregate([
      { $match: { ...earning, paidAt: { $gte: from, $lt: to } } },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
    ]);
    return { revenue: row?.revenue || 0, orders: row?.orders || 0 };
  };

  const [
    current,
    previous,
    [allTime = { revenue: 0, orders: 0 }],
    dailyRows,
    statusRows,
    customers,
    newCustomers,
    [stockTotals = { units: 0, value: 0, sold: 0 }],
    categoryRows,
    topProducts,
    lowStock,
    recentOrders,
    refundRows,
    afterSalesRows,
  ] = await Promise.all([
    sumBetween(periodStart, now),
    sumBetween(previousStart, periodStart),
    Order.aggregate([
      { $match: earning },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { ...earning, paidAt: { $gte: periodStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: TIMEZONE } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([{ $match: { paymentStatus: "PAID" } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Customer.countDocuments({ role: { $ne: "admin" } }),
    Customer.countDocuments({ role: { $ne: "admin" }, createdAt: { $gte: periodStart } }),
    Product.aggregate([
      {
        $group: {
          _id: null,
          units: { $sum: "$stock" },
          value: { $sum: { $multiply: ["$stock", "$price"] } },
          sold: { $sum: "$sold" },
        },
      },
    ]),
    Product.aggregate([
      {
        $group: {
          _id: "$category",
          sold: { $sum: "$sold" },
          sales: { $sum: { $multiply: ["$sold", "$price"] } },
          products: { $sum: 1 },
        },
      },
      { $sort: { sales: -1 } },
    ]),
    Product.find({ sold: { $gt: 0 } }).select("name category image price stock sold").sort({ sold: -1 }).limit(6),
    Product.find({ stock: { $lte: 20 } }).select("name category image stock sold").sort({ stock: 1 }).limit(6),
    Order.find({ paymentStatus: "PAID" })
      .populate("user", "fullName email")
      .select("user totalAmount status items.quantity paidAt createdAt")
      .sort({ createdAt: -1 })
      .limit(6),
    // Refunds by status, all time
    Order.aggregate([
      { $match: { refund: { $exists: true } } },
      { $group: { _id: "$refund.status", amount: { $sum: "$refund.amount" }, count: { $sum: 1 } } },
    ]),
    // Cancellations and returns in this period (by when they happened)
    Order.aggregate([
      { $match: { paymentStatus: "PAID" } },
      { $unwind: "$statusHistory" },
      { $match: { "statusHistory.status": { $in: ["CANCELLED", "RETURN_REQUESTED", "RETURNED"] }, "statusHistory.at": { $gte: periodStart } } },
      { $group: { _id: "$statusHistory.status", count: { $sum: 1 } } },
    ]),
  ]);

  const refunds = Object.fromEntries(refundRows.map((row) => [row._id, { amount: row.amount, count: row.count }]));
  const afterSales = Object.fromEntries(afterSalesRows.map((row) => [row._id, row.count]));
  const returnsPending = await Order.countDocuments({ "returnRequest.status": { $in: ["REQUESTED", "APPROVED"] } });

  // One entry per day, including days with no sales
  const byDay = new Map(dailyRows.map((row) => [row._id, row]));
  const daily = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dayKey(date);
    daily.push({ date: key, revenue: byDay.get(key)?.revenue || 0, orders: byDay.get(key)?.orders || 0 });
  }

  const change = (now_, before) => (before > 0 ? (now_ - before) / before : null);

  res.json({
    success: true,
    days,
    summary: {
      revenue: current.revenue,
      revenueChange: change(current.revenue, previous.revenue),
      orders: current.orders,
      ordersChange: change(current.orders, previous.orders),
      averageOrderValue: current.orders ? current.revenue / current.orders : 0,
      customers,
      newCustomers,
      allTimeRevenue: allTime.revenue,
      allTimeOrders: allTime.orders,
      unitsSold: stockTotals.sold,
      unitsInStock: stockTotals.units,
      inventoryValue: stockTotals.value,
    },
    afterSales: {
      refunded: refunds.PROCESSED?.amount || 0,
      refundedCount: refunds.PROCESSED?.count || 0,
      refundsPending: refunds.PENDING?.count || 0,
      refundsFailed: refunds.FAILED?.count || 0,
      returnsPending,
      cancelledInPeriod: afterSales.CANCELLED || 0,
      returnRequestsInPeriod: afterSales.RETURN_REQUESTED || 0,
      returnedInPeriod: afterSales.RETURNED || 0,
    },
    daily,
    statusCounts: Object.fromEntries(statusRows.map((row) => [row._id, row.count])),
    categories: categoryRows.map((row) => ({
      category: row._id,
      sold: row.sold,
      sales: row.sales,
      products: row.products,
    })),
    topProducts,
    lowStock,
    recentOrders,
  });
};
