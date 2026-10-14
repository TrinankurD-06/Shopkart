export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const PINCODE_REGEX = /^[1-9]\d{5}$/;

export const validateRegister = (form) => {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = "Full name is required.";
  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!form.password) errors.password = "Password is required.";
  else if (form.password.length < 6) errors.password = "Password must be at least 6 characters.";
  if (!form.phone.trim()) errors.phone = "Phone number is required.";
  else if (!PHONE_REGEX.test(form.phone.trim())) errors.phone = "Enter a valid 10-digit mobile number.";
  return errors;
};

export const validateShipping = (form) => {
  const errors = {};
  const required = {
    fullName: "Full name",
    phone: "Phone number",
    addressLine1: "Address",
    city: "City",
    state: "State",
    pincode: "Pincode",
  };

  // .trim() makes whitespace-only input count as empty
  for (const [field, label] of Object.entries(required)) {
    if (!form[field].trim()) errors[field] = `${label} is required.`;
  }
  if (!errors.phone && !PHONE_REGEX.test(form.phone.trim())) {
    errors.phone = "Enter a valid 10-digit mobile number.";
  }
  if (!errors.pincode && !PINCODE_REGEX.test(form.pincode.trim())) {
    errors.pincode = "Pincode must contain 6 digits.";
  }
  return errors;
};
