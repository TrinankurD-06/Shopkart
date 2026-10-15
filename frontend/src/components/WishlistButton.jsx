import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleWishlist } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

// One toggle used in two shapes: a round heart on product cards ("icon")
// and a square outline button beside "Add to bag" on the product page ("button").
function WishlistButton({ productId, productName, saved, onChange, variant = "icon" }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [pop, setPop] = useState(false);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return; // prevent duplicate requests

    setSaving(true);
    try {
      const data = await toggleWishlist(productId);
      onChange?.(productId, data.saved);
      window.dispatchEvent(new Event("wishlist:changed"));
      if (data.saved) {
        setPop(true);
        setTimeout(() => setPop(false), 400);
        toast({ text: `Saved ${productName ? `“${productName}”` : "item"} to your wishlist`, action: { label: "View", to: "/wishlist" } });
      } else {
        toast({ text: "Removed from your wishlist" });
      }
    } catch {
      toast({ text: "Unable to update your wishlist. Please try again.", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const label = saved ? "Remove from wishlist" : "Save to wishlist";

  if (variant === "button") {
    return (
      <button
        type="button"
        className={`btn btn-outline btn-lg ${saved ? "on" : ""}`}
        onClick={handleClick}
        disabled={saving}
        aria-pressed={saved}
        aria-label={label}
        title={label}
      >
        <Heart size={20} strokeWidth={1.8} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`heart-btn ${saved ? "on" : ""} ${pop ? "pop" : ""}`}
      onClick={handleClick}
      disabled={saving}
      aria-pressed={saved}
      aria-label={label}
      title={label}
    >
      <Heart size={17} strokeWidth={1.9} />
    </button>
  );
}

export default WishlistButton;
