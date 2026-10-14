import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { fetchWishlist } from "../services/api.js";

function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  // Wishlist count comes from the backend (not global state). It is refreshed
  // on navigation and whenever a component announces a wishlist change.
  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const loadCount = () =>
      fetchWishlist()
        .then((data) => active && setWishlistCount(data.count))
        .catch(() => {});

    loadCount();
    window.addEventListener("wishlist:changed", loadCount);
    return () => {
      active = false;
      window.removeEventListener("wishlist:changed", loadCount);
    };
  }, [user, location.pathname]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    navigate("/login", { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to={user ? "/home" : "/login"} className="brand">
          <span className="brand-mark">S</span>ShopKart
        </Link>

        {user && (
          <>
            <button
              type="button"
              className="menu-toggle"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ☰
            </button>

            <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
              <NavLink to="/home">Home</NavLink>
              <NavLink to="/products">Products</NavLink>
              <NavLink to="/wishlist">Wishlist ({wishlistCount})</NavLink>
              <NavLink to="/cart">Cart ({itemCount})</NavLink>
              <NavLink to="/orders">Orders</NavLink>
              <span className="nav-user" title={user.email}>
                Hi, {user.fullName.split(" ")[0]}
              </span>
              <button type="button" className="btn btn-small btn-outline" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </nav>
          </>
        )}

        {!user && (
          <nav className="nav-links nav-links-guest">
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Navbar;
