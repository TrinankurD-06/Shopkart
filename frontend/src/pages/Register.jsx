import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage, registerCustomer } from "../services/api.js";
import { validateRegister } from "../utils/validation.js";

const EMPTY_FORM = { fullName: "", email: "", password: "", phone: "" };

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

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="muted">Join ShopKart to save favourites, fill your cart and track orders.</p>

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="fullName">Full Name</label>
            <input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} autoComplete="name" className={errors.fullName ? "has-error" : ""} />
            {errors.fullName && <p className="field-error">{errors.fullName}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" className={errors.email ? "has-error" : ""} />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" value={form.password} onChange={handleChange} autoComplete="new-password" className={errors.password ? "has-error" : ""} />
            {errors.password ? <p className="field-error">{errors.password}</p> : <p className="hint">At least 6 characters.</p>}
          </div>

          <div className="form-field">
            <label htmlFor="phone">Phone Number</label>
            <input id="phone" name="phone" inputMode="numeric" maxLength={10} value={form.phone} onChange={handleChange} autoComplete="tel" className={errors.phone ? "has-error" : ""} />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </section>
  );
}

export default Register;
