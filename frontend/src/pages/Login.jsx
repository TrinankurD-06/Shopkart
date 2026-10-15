import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage, loginCustomer } from "../services/api.js";
import PasswordInput from "../components/PasswordInput.jsx";
import GoogleButton from "../components/GoogleButton.jsx";
import AuthAside from "../components/AuthAside.jsx";

// Shown when Google sign-in sends the browser back with ?oauth_error=...
const OAUTH_ERRORS = {
  cancelled: "Google sign-in was cancelled.",
  expired: "Google sign-in took too long. Please try again.",
  invalid_state: "That Google sign-in link was invalid or already used. Please try again.",
  email_unverified: "Your Google account's email isn't verified, so we can't use it to sign in.",
  google_failed: "We couldn't reach Google just now. Please try again.",
  not_configured: "Google sign-in isn't set up on this server yet.",
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  const [params] = useSearchParams();
  const registeredEmail = location.state?.registeredEmail || "";
  const oauthError = OAUTH_ERRORS[params.get("oauth_error")] || (params.get("oauth_error") ? "Google sign-in failed. Please try again." : "");
  const [form, setForm] = useState({ email: registeredEmail, password: "" });
  const [error, setError] = useState(oauthError);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      // The server sets the HttpOnly cookie - we never see or store the token
      await loginCustomer({ email: form.email.trim(), password: form.password });
      const me = await refreshUser();
      const fallback = me?.role === "admin" ? "/admin" : "/home";
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError(err.response?.status === 401 ? "That email and password don't match." : getErrorMessage(err, "Login failed."));
      setSubmitting(false);
    }
  };

  return (
    <section className="auth">
      <AuthAside />
      <div className="auth-main">
        <p className="eyebrow">Welcome back</p>
        <h1>Log in to ShopKart</h1>
        <p className="muted">Your bag, wishlist and saved addresses are waiting.</p>

        {registeredEmail && !error && (
          <div className="alert alert-success">
            <CheckCircle2 size={16} /> Account created. Log in to start shopping.
          </div>
        )}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <GoogleButton next={location.state?.from} />

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" placeholder="you@example.com" />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <PasswordInput id="password" name="password" value={form.password} onChange={handleChange} autoComplete="current-password" />
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

export default Login;
