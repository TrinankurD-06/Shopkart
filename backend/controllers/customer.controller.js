import bcrypt from "bcrypt";
import Customer from "../models/customer.model.js";
import generateToken, { COOKIE_NAME, cookieOptions } from "../utils/generateToken.js";
import { EMAIL_REGEX, PHONE_REGEX } from "../utils/validators.js";

const SALT_ROUNDS = 10;

const clean = (value) => (typeof value === "string" ? value.trim() : "");

// Only the fields the frontend needs - the password hash never leaves the server
const toPublicCustomer = (customer) => ({
  _id: customer._id,
  fullName: customer.fullName,
  email: customer.email,
  phone: customer.phone,
  createdAt: customer.createdAt,
});

// POST /customers/register
export const registerCustomer = async (req, res) => {
  const fullName = clean(req.body?.fullName);
  const email = clean(req.body?.email).toLowerCase();
  const phone = clean(req.body?.phone);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!fullName || !email || !password || !phone) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid email address" });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }
  if (!PHONE_REGEX.test(phone)) {
    return res.status(400).json({ success: false, message: "Phone number must be a valid 10-digit mobile number" });
  }

  const existing = await Customer.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: "Email is already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const customer = await Customer.create({ fullName, email, phone, password: hashedPassword });

  res.status(201).json({
    success: true,
    message: "Customer registered successfully",
    customer: toPublicCustomer(customer),
  });
};

// POST /customers/login
export const loginCustomer = async (req, res) => {
  const email = clean(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const customer = await Customer.findOne({ email }).select("+password");
  const passwordMatches = customer ? await bcrypt.compare(password, customer.password) : false;

  // Same message for both cases so we don't reveal which one was wrong
  if (!passwordMatches) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  generateToken(res, customer._id);

  res.json({
    success: true,
    message: "Login successful",
    customer: toPublicCustomer(customer),
  });
};

// GET /customers/me  (protected)
export const getMyProfile = async (req, res) => {
  res.json(toPublicCustomer(req.user));
};

// POST /customers/logout  (protected)
export const logoutCustomer = async (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ success: true, message: "Logged out successfully" });
};

// PATCH /customers/change-password  (protected, bonus)
export const changePassword = async (req, res) => {
  const oldPassword = typeof req.body?.oldPassword === "string" ? req.body.oldPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Old password and new password are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
  }

  const customer = await Customer.findById(req.user._id).select("+password");
  const oldMatches = await bcrypt.compare(oldPassword, customer.password);
  if (!oldMatches) {
    return res.status(401).json({ success: false, message: "Old password is incorrect" });
  }
  if (oldPassword === newPassword) {
    return res.status(400).json({ success: false, message: "New password must be different from the old password" });
  }

  customer.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await customer.save();

  res.json({ success: true, message: "Password changed successfully" });
};
