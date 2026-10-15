import Customer from "../models/customer.model.js";
import { isValidId, validateShippingAddress } from "../utils/validators.js";

const MAX_ADDRESSES = 6;

// Default address first, then newest first
const sortedAddresses = (customer) =>
  [...customer.addresses].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

const respond = (res, customer, message, status = 200) =>
  res.status(status).json({ success: true, message, addresses: sortedAddresses(customer) });

const setDefault = (customer, addressId) => {
  customer.addresses.forEach((address) => {
    address.isDefault = address._id.equals(addressId);
  });
};

// GET /customers/addresses
export const getAddresses = async (req, res) => {
  respond(res, req.user, "Addresses loaded");
};

// POST /customers/addresses  body: address fields + optional isDefault
export const addAddress = async (req, res) => {
  const { errors, address } = validateShippingAddress(req.body);
  if (errors.length) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  const customer = req.user;
  if (customer.addresses.length >= MAX_ADDRESSES) {
    return res.status(400).json({
      success: false,
      message: `You can save up to ${MAX_ADDRESSES} addresses. Remove one to add another.`,
    });
  }

  customer.addresses.push(address);
  const added = customer.addresses[customer.addresses.length - 1];
  // The first address, or one explicitly marked, becomes the default
  if (customer.addresses.length === 1 || req.body?.isDefault === true) setDefault(customer, added._id);

  await customer.save();
  res.status(201).json({
    success: true,
    message: "Address saved",
    address: added,
    addresses: sortedAddresses(customer),
  });
};

// PATCH /customers/addresses/:addressId
export const updateAddress = async (req, res) => {
  const { addressId } = req.params;
  if (!isValidId(addressId)) {
    return res.status(400).json({ success: false, message: "Invalid address ID" });
  }

  const customer = req.user;
  const existing = customer.addresses.id(addressId);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Address not found" });
  }

  const { errors, address } = validateShippingAddress(req.body);
  if (errors.length) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  existing.set(address);
  if (req.body?.isDefault === true) setDefault(customer, existing._id);

  await customer.save();
  respond(res, customer, "Address updated");
};

// PATCH /customers/addresses/:addressId/default
export const makeDefaultAddress = async (req, res) => {
  const { addressId } = req.params;
  if (!isValidId(addressId)) {
    return res.status(400).json({ success: false, message: "Invalid address ID" });
  }

  const customer = req.user;
  if (!customer.addresses.id(addressId)) {
    return res.status(404).json({ success: false, message: "Address not found" });
  }

  setDefault(customer, addressId);
  await customer.save();
  respond(res, customer, "Default address updated");
};

// DELETE /customers/addresses/:addressId
export const deleteAddress = async (req, res) => {
  const { addressId } = req.params;
  if (!isValidId(addressId)) {
    return res.status(400).json({ success: false, message: "Invalid address ID" });
  }

  const customer = req.user;
  const existing = customer.addresses.id(addressId);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Address not found" });
  }

  const wasDefault = existing.isDefault;
  existing.deleteOne();
  // Keep exactly one default while any address remains
  if (wasDefault && customer.addresses.length) {
    setDefault(customer, sortedAddresses(customer)[0]._id);
  }

  await customer.save();
  respond(res, customer, "Address removed");
};
