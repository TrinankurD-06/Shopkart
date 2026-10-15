import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
  },
  { _id: false }
);

// Saved delivery address. Each one keeps its own _id so it can be edited or removed.
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Always a bcrypt hash. select: false keeps it out of every query unless asked for.
    // Accounts created with Google have no password until they set one.
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId;
        },
        "Password is required",
      ],
      select: false,
    },
    // Google doesn't share a phone number, so it is optional for Google accounts
    phone: {
      type: String,
      required: [
        function () {
          return !this.googleId;
        },
        "Phone number is required",
      ],
      trim: true,
    },
    // Google's stable account id ("sub"), set when the customer signs in with Google
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatarUrl: {
      type: String,
    },
    // Admins manage stock and orders from the admin panel
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    // Address book - one of them can be the default used at checkout
    addresses: {
      type: [addressSchema],
      default: [],
    },
    // Lab 04: references only - the Product collection stays the source of truth
    wishlist: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
    // Lab 05: product reference + quantity
    cart: {
      type: [cartItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Extra safety net: never serialise the password, even if it was selected
customerSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
