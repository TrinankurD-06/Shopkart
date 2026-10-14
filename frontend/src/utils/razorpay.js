const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

// Loads Razorpay Standard Checkout once. Resolves false if it cannot be loaded
// (offline, blocked by an ad-blocker...) instead of assuming window.Razorpay exists.
export const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) existing.remove(); // a previous attempt failed - try again

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
