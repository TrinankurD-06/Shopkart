import { Link } from "react-router-dom";

// Wordmark: "Shop" upright, "kart" in italic, a saffron full stop
function Brand({ to = "/home", onClick }) {
  return (
    <Link to={to} className="brand" onClick={onClick} aria-label="ShopKart home">
      Shop<i>kart</i>
      <span className="brand-dot" aria-hidden="true" />
    </Link>
  );
}

export default Brand;
