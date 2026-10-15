import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { getErrorMessage, registerCustomer } from "../services/api.js";
import { validateRegister } from "../utils/validation.js";
import PasswordInput from "../components/PasswordInput.jsx";
import AuthAside from "../components/AuthAside.jsx";

const EMPTY_FORM = { fullName: "", email: "", password: "", phone: "" };

// 0-3 rough strength score, purely a hint
const strength = (password) => {
  if (!password) return 0;
  let score = password.length >= 6 ? 1 : 0;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /\d/.test(password)) score += 1;
  return score;
};
const STRENGTH_LABEL = ["Too short", "Okay", "Good", "Strong"];

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");

    const validationErrors = validateRegister(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    try {
      await registerCustomer({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
      });
      navigate("/login", { replace: true, state: { registeredEmail: form.email.trim() } });
    } catch (error) {
      setServerError(getErrorMessage(error, "Registration failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const score = strength(form.password);

  return (
    <section className="auth">
      <AuthAside />
      <div className="auth-main">
        <p className="eyebrow">New account</p>
        <h1>Create your account</h1>
        <p className="muted">Save favourites, keep addresses handy and track every order.</p>

        {serverError && (
          <div className="alert alert-error">
            <AlertCircle size={16} /> {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} autoComplete="name" className={errors.fullName ? "has-error" : ""} />
            {errors.fullName && <p className="field-error">{errors.fullName}</p>}
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" className={errors.email ? "has-error" : ""} />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>

            <div className="field">
              <label htmlFor="phone">Mobile number</label>
              <input id="phone" name="phone" inputMode="numeric" maxLength={10} value={form.phone} onChange={handleChange} autoComplete="tel" placeholder="10 digits, starts 6–9" className={errors.phone ? "has-error" : ""} />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <PasswordInput id="password" name="password" value={form.password} onChange={handleChange} autoComplete="new-password" className={errors.password ? "has-error" : ""} />
            {errors.password ? (
              <p className="field-error">{errors.password}</p>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="meter" style={{ flex: 1, height: 4 }}>
                  <div className={`meter-fill ${score <= 1 ? "warn" : ""}`} style={{ width: `${(score / 3) * 100}%` }} />
                </div>
                <span className="field-hint" style={{ minWidth: 70, textAlign: "right" }}>
                  {form.password ? STRENGTH_LABEL[score] : "6+ characters"}
                </span>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already shopping with us? <Link to="/login">Log in</Link>
        </p>
      </div>
    </section>
  );
}

export default Register;
