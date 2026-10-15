import { Link } from "react-router-dom";
import { CircleSlash, IndianRupee, PackageCheck, RotateCcw, Truck } from "lucide-react";

const RETURN_STEPS = [
  { icon: RotateCcw, title: "Request", text: "Open the order and choose “Return order” within 7 days of delivery." },
  { icon: PackageCheck, title: "Review", text: "We review every request within 1–2 days and email you either way." },
  { icon: Truck, title: "Pickup", text: "Once approved, a courier collects the item from your address." },
  { icon: IndianRupee, title: "Refund", text: "When it reaches our warehouse, we refund the full amount." },
];

// Public page: what customers can expect when they cancel or return
function ReturnsPolicy() {
  return (
    <section className="policy">
      <div className="page-head">
        <div>
          <p className="eyebrow">Help</p>
          <h1>Returns & refunds</h1>
          <p className="muted">Plain rules, no fine print.</p>
        </div>
      </div>

      <div className="policy-grid">
        <div className="panel">
          <span className="policy-icon">
            <CircleSlash size={20} />
          </span>
          <h2 className="panel-title">Cancelling an order</h2>
          <ul>
            <li>
              Cancel any time <strong>before your order ships</strong> (while it's Placed or Confirmed) from <Link to="/orders" className="link">Orders</Link>.
            </li>
            <li>The full amount goes back to your original payment method immediately.</li>
            <li>Once an order has shipped it can't be cancelled, but you can return it after delivery.</li>
          </ul>
        </div>

        <div className="panel">
          <span className="policy-icon">
            <RotateCcw size={20} />
          </span>
          <h2 className="panel-title">Returning an order</h2>
          <ul>
            <li>
              Returns are open for <strong>7 days after delivery</strong>.
            </li>
            <li>Items should be unused and in their original packaging, unless they arrived damaged or wrong.</li>
            <li>You can withdraw a request any time before we review it.</li>
          </ul>
        </div>
      </div>

      <h2 className="section-title">How a return works</h2>
      <ol className="policy-steps">
        {RETURN_STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title}>
            <span className="policy-step-num">{index + 1}</span>
            <Icon size={18} />
            <strong>{title}</strong>
            <p>{text}</p>
          </li>
        ))}
      </ol>

      <div className="panel">
        <span className="policy-icon">
          <IndianRupee size={20} />
        </span>
        <h2 className="panel-title">Refunds</h2>
        <ul>
          <li>Refunds go to the original payment method through Razorpay (card, UPI, netbanking or wallet).</li>
          <li>Most banks show the money within 5–7 working days of the refund being processed.</li>
          <li>You can follow the refund status, and its Razorpay refund ID, on the order page.</li>
          <li>
            ShopKart runs in <strong>Razorpay Test Mode</strong>: refunds are real Razorpay test refunds, but no real money moves.
          </li>
        </ul>
      </div>
    </section>
  );
}

export default ReturnsPolicy;
