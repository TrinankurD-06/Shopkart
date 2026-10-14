import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CheckoutForm from "../components/CheckoutForm.jsx";
import OrderSummary from "../components/OrderSummary.jsx";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import {
  createPaymentOrder,
  getErrorMessage,
  reportPaymentFailure,
  verifyPayment,
} from "../services/api.js";
import { formatPrice } from "../utils/format.js";
import { loadRazorpayScript } from "../utils/razorpay.js";
import { validateShipping } from "../utils/validation.js";

const STEP_LABELS = {
  creating: "Creating your order...",
  paying: "Waiting for payment...",
  verifying: "Verifying payment...",
};

function Checkout() {
  const { user } = useAuth();
  const { cartItems, subtotal, loading, loaded, refreshCart, clearCart } = useCart();
  const navigate = useNavigate();

  // Form state lives here, in the page that submits it
  const [address, setAddress] = useState({
    fullName: user.fullName,
    phone: user.phone,
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("idle");
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);

  const busy = step !== "idle";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const openRazorpay = (checkout, shippingAddress) => {
    const razorpay = new window.Razorpay({
      key: checkout.key,
      amount: checkout.amount,
      currency: checkout.currency,
      name: "ShopKart",
      description: "ShopKart Order",
      order_id: checkout.razorpayOrderId,
      prefill: {
        name: shippingAddress.fullName,
        contact: shippingAddress.phone,
        email: user.email,
      },
      theme: { color: "#1d6b5c" },

      // Called by Razorpay after a successful payment. This does NOT prove the payment -
      // we send the details to our backend, which verifies the signature.
      handler: async (response) => {
        setStep("verifying");
        setMessage("");
        try {
          const result = await verifyPayment({
            shopKartOrderId: checkout.shopKartOrderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          setCompleted(true);
          clearCart(); // backend cart is already empty -> Navbar shows Cart (0)
          navigate(`/order-success/${result.order._id}`, { replace: true });
        } catch (error) {
          setMessage(`${getErrorMessage(error, "Payment verification failed.")} Your cart has not been cleared.`);
          setStep("idle");
        }
      },

      modal: {
        ondismiss: () => {
          setStep((current) => (current === "verifying" ? current : "idle"));
          setMessage((current) => current || "Payment was cancelled. Your cart has not been cleared.");
        },
      },
    });

    razorpay.on("payment.failed", (response) => {
      reportPaymentFailure(checkout.shopKartOrderId).catch(() => {});
      const reason = response.error?.description || "The payment could not be completed.";
      setMessage(`Payment failed: ${reason} Your cart has not been cleared. Please try again.`);
    });

    razorpay.open();
  };

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    setMessage("");

    // Basic validation first - don't call the backend if it fails
    const validationErrors = validateShipping(address);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    const shippingAddress = Object.fromEntries(
      Object.entries(address).map(([key, value]) => [key, value.trim()])
    );

    setStep("creating");

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setMessage("Could not load Razorpay Checkout. Check your internet connection and try again.");
      setStep("idle");
      return;
    }

    let checkout;
    try {
      // Only the address is sent; the server re-checks stock and calculates the total.
      checkout = await createPaymentOrder(shippingAddress);
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not create your order."));
      setStep("idle");
      refreshCart(); // stock or prices may have changed
      return;
    }

    setStep("paying");
    openRazorpay(checkout, shippingAddress);
  };

  if (completed) return <Loader text="Payment verified! Taking you to your order..." />;
  if (loading && !loaded) return <Loader text="Loading your cart..." />;

  if (cartItems.length === 0) {
    return (
      <StateMessage icon="🛒" title="Your cart is empty" text="Add some products before checking out.">
        <Link to="/products" className="btn btn-primary">
          Browse Products
        </Link>
      </StateMessage>
    );
  }

  const summaryItems = cartItems.map((item) => ({
    key: item.product._id,
    name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
  }));

  return (
    <section>
      <div className="page-head">
        <h1>Checkout</h1>
        <Link to="/cart" className="btn btn-outline">
          ← Back to Cart
        </Link>
      </div>

      <form className="two-col" onSubmit={handlePlaceOrder} noValidate>
        <div className="card panel">
          <h2>Shipping Details</h2>
          <CheckoutForm values={address} errors={errors} onChange={handleChange} disabled={busy} />
        </div>

        <OrderSummary items={summaryItems} total={subtotal}>
          {message && <div className="alert alert-error">{message}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? STEP_LABELS[step] : `Place Order · Pay ${formatPrice(subtotal)}`}
          </button>
          <p className="hint center">
            Secure payment by Razorpay (Test Mode). The final amount is calculated by the server.
          </p>
        </OrderSummary>
      </form>
    </section>
  );
}

export default Checkout;
