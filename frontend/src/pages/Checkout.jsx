import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, Lock, Plus, ShoppingBag } from "lucide-react";
import OrderSummary from "../components/OrderSummary.jsx";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import AddressForm from "../components/AddressForm.jsx";
import AddressText, { AddressLabel } from "../components/AddressText.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAddresses } from "../context/AddressContext.jsx";
import { createPaymentOrder, getErrorMessage, reportPaymentFailure, verifyPayment } from "../services/api.js";
import { deliveryWindow, formatPrice } from "../utils/format.js";
import { loadRazorpayScript } from "../utils/razorpay.js";

const STEP_LABELS = {
  creating: "Creating your order...",
  paying: "Waiting for payment...",
  verifying: "Verifying payment...",
};

const ONE_OFF = "one-off";

// Only the fields the order stores
const toShippingAddress = (address) => ({
  label: address.label,
  fullName: address.fullName,
  phone: address.phone,
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2 || "",
  city: address.city,
  state: address.state,
  pincode: address.pincode,
});

function Steps() {
  return (
    <div className="steps" aria-label="Checkout progress">
      <span className="done">
        <i>
          <Check size={12} />
        </i>
        Bag
      </span>
      <span className="sep" />
      <span className="now">
        <i>2</i>Address & payment
      </span>
      <span className="sep" />
      <span>
        <i>3</i>Confirmation
      </span>
    </div>
  );
}

function Checkout() {
  const { user } = useAuth();
  const { cartItems, subtotal, loading, loaded, refreshCart, clearCart } = useCart();
  const { addresses, defaultAddress, loaded: addressesLoaded, save } = useAddresses();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saveToBook, setSaveToBook] = useState(true);
  const [oneOff, setOneOff] = useState(null);
  const [step, setStep] = useState("idle");
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);

  const busy = step !== "idle";

  // Pre-select the default address once the address book has loaded
  useEffect(() => {
    if (!addressesLoaded) return;
    if (selectedId === null && defaultAddress) setSelectedId(defaultAddress._id);
    if (addresses.length === 0 && !oneOff) setAdding(true);
  }, [addressesLoaded, defaultAddress, addresses.length, selectedId, oneOff]);

  const selectedAddress = selectedId === ONE_OFF ? oneOff : addresses.find((address) => address._id === selectedId);

  const handleNewAddress = async (values) => {
    if (saveToBook) {
      const result = await save(values);
      if (!result.ok) return result;
      setSelectedId(result.address._id);
    } else {
      setOneOff(values);
      setSelectedId(ONE_OFF);
    }
    setAdding(false);
    setMessage("");
    return { ok: true };
  };

  const openRazorpay = (checkout, shippingAddress) => {
    const razorpay = new window.Razorpay({
      key: checkout.key,
      amount: checkout.amount,
      currency: checkout.currency,
      name: "ShopKart",
      description: `${cartItems.length} item${cartItems.length === 1 ? "" : "s"} · free delivery`,
      order_id: checkout.razorpayOrderId,
      prefill: {
        name: shippingAddress.fullName,
        contact: shippingAddress.phone,
        email: user.email,
      },
      theme: { color: "#1f4a3a" },

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
          clearCart(); // backend cart is already empty -> navbar bag count drops to 0
          navigate(`/order-success/${result.order._id}`, { replace: true });
        } catch (error) {
          setMessage(`${getErrorMessage(error, "Payment verification failed.")} Your bag has not been cleared.`);
          setStep("idle");
        }
      },

      modal: {
        ondismiss: () => {
          setStep((current) => (current === "verifying" ? current : "idle"));
          setMessage((current) => current || "Payment was cancelled. Your bag is just as you left it.");
        },
      },
    });

    razorpay.on("payment.failed", (response) => {
      reportPaymentFailure(checkout.shopKartOrderId).catch(() => {});
      const reason = response.error?.description || "The payment could not be completed.";
      setMessage(`Payment failed: ${reason} Your bag has not been cleared, so you can try again.`);
    });

    razorpay.open();
  };

  const handlePlaceOrder = async () => {
    setMessage("");
    if (!selectedAddress) {
      setMessage("Choose a delivery address first.");
      return;
    }

    const shippingAddress = toShippingAddress(selectedAddress);
    setStep("creating");

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setMessage("Could not load Razorpay Checkout. Check your internet connection (or ad-blocker) and try again.");
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

  if (completed) return <Loader text="Payment verified! Preparing your receipt..." />;
  if ((loading && !loaded) || !addressesLoaded) return <Loader text="Getting checkout ready..." />;

  if (cartItems.length === 0) {
    return (
      <StateMessage icon={ShoppingBag} title="Your bag is empty" text="Add something you love before checking out.">
        <Link to="/products" className="btn btn-primary">
          Browse the shop
        </Link>
      </StateMessage>
    );
  }

  const summaryItems = cartItems.map((item) => ({
    key: item.product._id,
    name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
    image: item.product.image,
  }));
  const { earliest, latest } = deliveryWindow();

  return (
    <section>
      <Link to="/cart" className="back-link">
        <ArrowLeft size={15} /> Back to bag
      </Link>
      <Steps />
      <h1 style={{ marginBottom: 24 }}>Checkout</h1>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Delivery address</h2>
              <p className="panel-sub">Free delivery, arriving {earliest} – {latest}</p>
            </div>
          </div>

          {!adding && (
            <div className="addr-grid" role="radiogroup" aria-label="Saved addresses">
              {addresses.map((address) => (
                <button
                  key={address._id}
                  type="button"
                  role="radio"
                  aria-checked={selectedId === address._id}
                  className={`addr-card ${selectedId === address._id ? "selected" : ""}`}
                  onClick={() => setSelectedId(address._id)}
                  disabled={busy}
                >
                  <span className="addr-top">
                    <AddressLabel label={address.label} isDefault={address.isDefault} />
                  </span>
                  <AddressText address={address} />
                </button>
              ))}
              {oneOff && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedId === ONE_OFF}
                  className={`addr-card ${selectedId === ONE_OFF ? "selected" : ""}`}
                  onClick={() => setSelectedId(ONE_OFF)}
                  disabled={busy}
                >
                  <span className="addr-top">
                    <span className="addr-label">This order only</span>
                  </span>
                  <AddressText address={oneOff} />
                </button>
              )}
              <button type="button" className="addr-new" onClick={() => setAdding(true)} disabled={busy}>
                <span style={{ display: "grid", placeItems: "center", gap: 6 }}>
                  <Plus size={20} />
                  Add a new address
                </span>
              </button>
            </div>
          )}

          {adding && (
            <AddressForm
              initial={{ fullName: user.fullName, phone: user.phone, label: addresses.length ? "Other" : "Home" }}
              onSubmit={handleNewAddress}
              onCancel={addresses.length || oneOff ? () => setAdding(false) : undefined}
              submitLabel="Deliver here"
              busy={busy}
            >
              <label className="check" style={{ marginBottom: 18 }}>
                <input type="checkbox" checked={saveToBook} onChange={(event) => setSaveToBook(event.target.checked)} />
                Save to my address book for next time
              </label>
            </AddressForm>
          )}
        </div>

        <OrderSummary items={summaryItems} total={subtotal}>
          {selectedAddress && !adding && (
            <p className="small muted" style={{ margin: "0 0 14px" }}>
              Shipping to <strong style={{ color: "var(--ink)" }}>{selectedAddress.fullName}</strong>, {selectedAddress.city}{" "}
              <span className="mono">{selectedAddress.pincode}</span>
            </p>
          )}
          {message && (
            <div className="alert alert-error">
              <AlertCircle size={16} /> {message}
            </div>
          )}
          <button type="button" className="btn btn-primary btn-block btn-lg" onClick={handlePlaceOrder} disabled={busy || adding || !selectedAddress}>
            {busy ? (
              <>
                <span className="spinner spinner-sm" style={{ borderTopColor: "#fff" }} /> {STEP_LABELS[step]}
              </>
            ) : (
              <>
                <Lock size={16} /> Pay {formatPrice(subtotal)}
              </>
            )}
          </button>
          <p className="secure-note">Razorpay Test Mode · tip: Netbanking → any bank → Success</p>
        </OrderSummary>
      </div>
    </section>
  );
}

export default Checkout;
