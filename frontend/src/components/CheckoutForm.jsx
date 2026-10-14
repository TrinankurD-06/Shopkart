const FIELDS = [
  { name: "fullName", label: "Full Name", autoComplete: "name" },
  { name: "phone", label: "Phone", autoComplete: "tel", inputMode: "numeric", maxLength: 10 },
  { name: "addressLine1", label: "Address", autoComplete: "street-address" },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "state", label: "State", autoComplete: "address-level1" },
  { name: "pincode", label: "Pincode", autoComplete: "postal-code", inputMode: "numeric", maxLength: 6 },
];

// Controlled form - the state lives in the Checkout page
function CheckoutForm({ values, errors, onChange, disabled }) {
  return (
    <fieldset className="form-grid" disabled={disabled}>
      {FIELDS.map(({ name, label, ...inputProps }) => (
        <div key={name} className={`form-field ${name === "addressLine1" ? "span-2" : ""}`}>
          <label htmlFor={name}>{label}</label>
          <input
            id={name}
            name={name}
            value={values[name]}
            onChange={onChange}
            className={errors[name] ? "has-error" : ""}
            {...inputProps}
          />
          {errors[name] && <p className="field-error">{errors[name]}</p>}
        </div>
      ))}
    </fieldset>
  );
}

export default CheckoutForm;
