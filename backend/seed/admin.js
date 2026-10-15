// Usage: npm run seed:admin
// Creates (or resets) the placeholder admin account. Override the defaults with
// ADMIN_EMAIL / ADMIN_PASSWORD in backend/.env before running it on a real deployment.
import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Customer from "../models/customer.model.js";

const ADMIN = {
  fullName: "Store Admin",
  email: (process.env.ADMIN_EMAIL || "admin@shopkart.dev").toLowerCase(),
  phone: "9876500000",
  password: process.env.ADMIN_PASSWORD || "Admin@123",
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const password = await bcrypt.hash(ADMIN.password, 10);
  const admin = await Customer.findOneAndUpdate(
    { email: ADMIN.email },
    { $set: { fullName: ADMIN.fullName, phone: ADMIN.phone, password, role: "admin" } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin ready: ${admin.email} (database "${mongoose.connection.name}")`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Creating the admin failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
