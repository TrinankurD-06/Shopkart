import { useEffect, useState } from "react";
import { toggleWishlist } from "../services/api.js";

// Single toggle button used on product cards and the product details page.
// States: default -> saving -> added/remove, with a visible error on failure.
function WishlistButton({ productId, saved, onChange }) {
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!justAdded) return undefined;
    const timer = setTimeout(() => setJustAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [justAdded]);

  const handleClick = async () => {
    if (saving) return; // prevent duplicate requests
    setSaving(true);
    setError("");
    try {
      const data = await toggleWishlist(productId);
      onChange(productId, data.saved);
      setJustAdded(data.saved);
      window.dispatchEvent(new Event("wishlist:changed"));
    } catch {
      setError("Unable to save product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  let label = "♡ Add to Wishlist";
  if (saving) label = "⏳ Saving...";
  else if (justAdded) label = "♥ Added to Wishlist";
  else if (saved) label = "♥ Remove from Wishlist";

  return (
    <div className="wishlist-action">
      <button
        type="button"
        className={`btn btn-small btn-wish ${saved ? "is-saved" : ""}`}
        onClick={handleClick}
        disabled={saving}
      >
        {label}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export default WishlistButton;
