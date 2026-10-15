import { useState } from "react";
import { Briefcase, Crosshair, Home, MapPin } from "lucide-react";
import { detectLocation } from "../utils/location.js";
import { validateShipping } from "../utils/validation.js";

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

const LABELS = [
  { value: "Home", icon: Home },
  { value: "Work", icon: Briefcase },
  { value: "Other", icon: MapPin },
];

export const EMPTY_ADDRESS = {
  label: "Home",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
};

// Pick only the editable fields from a saved address
export const toFormValues = (address) =>
  Object.fromEntries(Object.keys(EMPTY_ADDRESS).map((key) => [key, address?.[key] ?? EMPTY_ADDRESS[key]]));

// Shared by checkout and the account page. `onSubmit` receives trimmed values
// and returns { ok, message } so the form can show server-side errors.
function AddressForm({ initial, onSubmit, onCancel, submitLabel = "Save address", children, busy = false }) {
  const [values, setValues] = useState(() => toFormValues(initial));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateNote, setLocateNote] = useState({ text: "", ok: true });
  const [saving, setSaving] = useState(false);

  const set = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
  };

  const handleChange = (event) => set(event.target.name, event.target.value);

  const handleLocate = async () => {
    setLocating(true);
    setLocateNote({ text: "", ok: true });
    try {
      const place = await detectLocation();
      setValues((prev) => ({
        ...prev,
        addressLine2: place.addressLine2 || prev.addressLine2,
        city: place.city || prev.city,
        state: INDIAN_STATES.find((state) => state.toLowerCase() === place.state.toLowerCase()) || place.state || prev.state,
        pincode: place.pincode || prev.pincode,
      }));
      setErrors({});
      setLocateNote({
        text: place.pincode
          ? `Filled in ${place.city}, ${place.state}. Add your house and street below.`
          : `Found ${place.city || "your area"} — please check the pincode.`,
        ok: true,
      });
    } catch (error) {
      setLocateNote({ text: error.message, ok: false });
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateShipping(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value).trim()]));
    setSaving(true);
    const result = await onSubmit(trimmed);
    setSaving(false);
    if (result && !result.ok) setServerError(result.message);
  };

  const field = (name, label, props = {}, optional = false) => (
    <div className={`field ${props.className || ""}`}>
      <label htmlFor={`addr-${name}`}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      <input
        id={`addr-${name}`}
        name={name}
        value={values[name]}
        onChange={handleChange}
        className={errors[name] ? "has-error" : ""}
        {...props}
      />
      {errors[name] && <p className="field-error">{errors[name]}</p>}
    </div>
  );

  const disabled = busy || saving;

  return (
    <form className="addr-form" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={disabled}>
        <button type="button" className="btn btn-outline btn-sm locate-btn" onClick={handleLocate} disabled={locating}>
          {locating ? <span className="spinner spinner-sm" /> : <Crosshair size={15} />}
          {locating ? "Finding you..." : "Use my current location"}
        </button>
        {locateNote.text && (
          <p className={locateNote.ok ? "field-success" : "field-error"} style={{ marginTop: -8, marginBottom: 16 }}>
            {locateNote.text}
          </p>
        )}

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <div className="field">
          <span className="label">Save as</span>
          <div className="label-pills" role="radiogroup" aria-label="Address label">
            {LABELS.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={values.label === value}
                className={values.label === value ? "on" : ""}
                onClick={() => set("label", value)}
              >
                <Icon size={14} /> {value}
              </button>
            ))}
          </div>
        </div>

        <div className="form-grid">
          {field("fullName", "Full name", { autoComplete: "name" })}
          {field("phone", "Mobile number", { autoComplete: "tel", inputMode: "numeric", maxLength: 10, placeholder: "10-digit number" })}
          {field("addressLine1", "House / flat, street", { autoComplete: "address-line1", className: "span-2", placeholder: "e.g. 12B, Lake View Apartments, MG Road" })}
          {field("addressLine2", "Area, landmark", { autoComplete: "address-line2", className: "span-2", placeholder: "e.g. Near City Mall" }, true)}
          {field("city", "City", { autoComplete: "address-level2" })}
          <div className="field">
            <label htmlFor="addr-state">State</label>
            <select id="addr-state" name="state" value={values.state} onChange={handleChange} className={errors.state ? "has-error" : ""} autoComplete="address-level1">
              <option value="">Select state</option>
              {values.state && !INDIAN_STATES.includes(values.state) && <option value={values.state}>{values.state}</option>}
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {errors.state && <p className="field-error">{errors.state}</p>}
          </div>
          {field("pincode", "Pincode", { autoComplete: "postal-code", inputMode: "numeric", maxLength: 6, placeholder: "6 digits" })}
        </div>

        {children}

        <div className="form-actions" style={{ marginTop: 6 }}>
          <button type="submit" className="btn btn-primary">
            {saving ? "Saving..." : submitLabel}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}

export default AddressForm;
