import jwt from "jsonwebtoken";
import Customer from "../models/customer.model.js";
import { COOKIE_NAME } from "../utils/generateToken.js";

// Reads the JWT from the HttpOnly cookie (or an "Authorization: Bearer" header for Postman),
// verifies it and attaches the logged-in customer to req.user.
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = req.cookies?.[COOKIE_NAME] || bearerToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authenticated. Please log in." });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
  }

  const customer = await Customer.findById(decoded.id);
  if (!customer) {
    return res.status(401).json({ success: false, message: "Account no longer exists. Please log in again." });
  }

  req.user = customer;
  next();
};

export default protect;
