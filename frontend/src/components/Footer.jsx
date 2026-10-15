import { Link } from "react-router-dom";
import Brand from "./Brand.jsx";

const CATEGORIES = ["Electronics", "Fashion", "Books", "Home"];

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Brand />
          <p style={{ marginTop: 12, maxWidth: 300 }}>
            Everyday goods, chosen with care. A small catalogue, honest prices and free delivery on every
            order.
          </p>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            {CATEGORIES.map((category) => (
              <li key={category}>
                <Link to={`/products?category=${category}`}>{category}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Your account</h4>
          <ul>
            <li>
              <Link to="/orders">Orders & tracking</Link>
            </li>
            <li>
              <Link to="/wishlist">Wishlist</Link>
            </li>
            <li>
              <Link to="/account#addresses">Saved addresses</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Good to know</h4>
          <ul>
            <li>Free delivery, 3–5 days</li>
            <li>
              <Link to="/returns">Returns & refunds</Link>
            </li>
            <li>Payments by Razorpay</li>
            <li>Test Mode: nothing is charged</li>
          </ul>
        </div>
      </div>
      <div className="footer-base">
        <span>© {new Date().getFullYear()} ShopKart · Engineering Labs project</span>
        <span>Made in India · Prices in INR, inclusive of taxes</span>
      </div>
    </footer>
  );
}

export default Footer;
