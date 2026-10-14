import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { changePassword, getErrorMessage } from "../services/api.js";
import { formatDate, formatPrice } from "../utils/format.js";

function ChangePasswordForm() {
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [status, setStatus] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setStatus({ type: "", text: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.oldPassword || !form.newPassword) {
      return setStatus({ type: "error", text: "Please fill in both passwords." });
    }
    if (form.newPassword.length < 6) {
      return setStatus({ type: "error", text: "New password must be at least 6 characters." });
    }
    if (form.newPassword !== form.confirm) {
      return setStatus({ type: "error", text: "New passwords do not match." });
    }

    setSaving(true);
    try {
      const data = await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
      setStatus({ type: "success", text: data.message });
      setForm({ oldPassword: "", newPassword: "", confirm: "" });
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card panel" onSubmit={handleSubmit} noValidate>
      <h2>Change Password</h2>
      {status.text && <div className={`alert alert-${status.type}`}>{status.text}</div>}
      <div className="form-field">
        <label htmlFor="oldPassword">Current password</label>
        <input id="oldPassword" name="oldPassword" type="password" value={form.oldPassword} onChange={handleChange} autoComplete="current-password" />
      </div>
      <div className="form-field">
        <label htmlFor="newPassword">New password</label>
        <input id="newPassword" name="newPassword" type="password" value={form.newPassword} onChange={handleChange} autoComplete="new-password" />
      </div>
      <div className="form-field">
        <label htmlFor="confirm">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" value={form.confirm} onChange={handleChange} autoComplete="new-password" />
      </div>
      <button type="submit" className="btn btn-outline" disabled={saving}>
        {saving ? "Saving..." : "Update Password"}
      </button>
    </form>
  );
}

function Home() {
  const { user, refreshUser } = useAuth();
  const { itemCount, subtotal } = useCart();

  // Always show fresh profile data from GET /customers/me
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <section>
      <div className="hero">
        <div>
          <p className="eyebrow">My ShopKart</p>
          <h1>Welcome, {user.fullName}! 👋</h1>
          <p className="muted">Good to see you. Pick up where you left off.</p>
        </div>
        <Link to="/products" className="btn btn-primary">
          Start Shopping →
        </Link>
      </div>

      <div className="home-grid">
        <div className="card panel">
          <h2>My Profile</h2>
          <dl className="profile-list">
            <div>
              <dt>Name</dt>
              <dd>{user.fullName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{user.phone}</dd>
            </div>
            {user.createdAt && (
              <div>
                <dt>Member since</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="quick-links">
          <Link to="/products" className="card quick-link">
            <span className="quick-icon">🛍️</span>
            <strong>Browse Products</strong>
            <span className="muted">Search and filter the catalogue</span>
          </Link>
          <Link to="/wishlist" className="card quick-link">
            <span className="quick-icon">♥</span>
            <strong>My Wishlist</strong>
            <span className="muted">Things you saved for later</span>
          </Link>
          <Link to="/cart" className="card quick-link">
            <span className="quick-icon">🛒</span>
            <strong>My Cart ({itemCount})</strong>
            <span className="muted">{itemCount ? `Subtotal ${formatPrice(subtotal)}` : "Your cart is empty"}</span>
          </Link>
          <Link to="/orders" className="card quick-link">
            <span className="quick-icon">📦</span>
            <strong>My Orders</strong>
            <span className="muted">Track what you bought</span>
          </Link>
        </div>

        <ChangePasswordForm />
      </div>
    </section>
  );
}

export default Home;
