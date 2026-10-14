// A MongoDB ObjectId is exactly 24 hex characters.
// (mongoose.isValidObjectId also accepts any 12-character string, which is too loose here.)
export const isValidId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/; // 10-digit Indian mobile number
export const PINCODE_REGEX = /^[1-9]\d{5}$/; // 6-digit Indian pincode

const asTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

const SHIPPING_FIELDS = {
  fullName: "Full name",
  phone: "Phone number",
  addressLine1: "Address",
  city: "City",
  state: "State",
  pincode: "Pincode",
};

// Returns { errors, address } - address only contains trimmed, known fields
export const validateShippingAddress = (input) => {
  const errors = [];
  const address = {};

  if (!input || typeof input !== "object") {
    return { errors: ["Shipping address is required"], address };
  }

  for (const [field, label] of Object.entries(SHIPPING_FIELDS)) {
    address[field] = asTrimmedString(input[field]);
    if (!address[field]) errors.push(`${label} is required`);
  }

  if (address.phone && !PHONE_REGEX.test(address.phone)) {
    errors.push("Phone number must be a valid 10-digit mobile number");
  }
  if (address.pincode && !PINCODE_REGEX.test(address.pincode)) {
    errors.push("Pincode must contain 6 digits");
  }

  return { errors, address };
};
