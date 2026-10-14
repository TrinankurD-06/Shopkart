import Razorpay from "razorpay";

let instance = null;

// Created lazily so the rest of the app still runs if Razorpay keys are not set yet.
const getRazorpay = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured on the server");
  }

  if (!instance) {
    instance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }

  return instance;
};

export default getRazorpay;
