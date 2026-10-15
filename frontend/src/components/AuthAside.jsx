import { CreditCard, PackageCheck, Truck } from "lucide-react";
import Brand from "./Brand.jsx";

// Left half of the login / register screens
function AuthAside() {
  return (
    <aside className="auth-aside">
      <Brand to="/login" />
      <div style={{ position: "relative", zIndex: 1 }}>
        <p className="auth-quote">
          Everyday goods,
          <br />
          <em>well chosen.</em>
        </p>
        <ul className="auth-points">
          <li>
            <Truck size={16} /> Free delivery on every order, in 3–5 days
          </li>
          <li>
            <PackageCheck size={16} /> Track each order from placed to delivered
          </li>
          <li>
            <CreditCard size={16} /> Payments secured by Razorpay
          </li>
        </ul>
      </div>
      <p className="mono small" style={{ margin: 0, opacity: 0.6, position: "relative" }}>
        20 products · 4 categories · Est. 2026
      </p>
    </aside>
  );
}

export default AuthAside;
