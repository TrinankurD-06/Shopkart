import { Briefcase, Home, MapPin } from "lucide-react";

const LABEL_ICONS = { Home, Work: Briefcase, Other: MapPin };

export function AddressLabel({ label = "Home", isDefault = false }) {
  const Icon = LABEL_ICONS[label] || MapPin;
  return (
    <>
      <span className="addr-label">
        <Icon size={11} /> {label}
      </span>
      {isDefault && <span className="addr-label default">Default</span>}
    </>
  );
}

// The body of an address: name, lines, city/state/pincode, phone
function AddressText({ address }) {
  return (
    <>
      <strong>{address.fullName}</strong>
      <br />
      {address.addressLine1}
      {address.addressLine2 && (
        <>
          <br />
          {address.addressLine2}
        </>
      )}
      <br />
      {address.city}, {address.state} <span className="mono">{address.pincode}</span>
      <br />
      <span className="mono small">+91 {address.phone}</span>
    </>
  );
}

export default AddressText;
