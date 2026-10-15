import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Heart, LayoutDashboard, LogOut, MapPin, Menu, Package, ShoppingBag, User, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAddresses } from "../context/AddressContext.jsx";
import { fetchWishlist } from "../services/api.js";
import { firstName } from "../utils/format.js";
import Brand from "./Brand.jsx";
import Avatar from "./Avatar.jsx";

const ANNOUNCEMENTS = [
  "Free delivery on every order",
  "Payments run in Razorpay Test Mode — no real money moves",
  "Track every order from placed to delivered",
  "Save your addresses for one-tap checkout",
];

function AnnouncementBar() {
  // Rendered twice so the marquee loops without a gap
  const items = [...ANNOUNCEMENTS, ...ANNOUNCEMENTS];
  return (
    <div className="announce" aria-label="Store announcements">
      <div className="announce-track">
        {items.map((text, index) => (
          <span key={index} aria-hidden={index >= ANNOUNCEMENTS.length}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

// A count that replays a small "bump" animation whenever it changes
function CountBadge({ count, accent = false }) {
  const [bump, setBump] = useState(false);
  const previous = useRef(count);

  useEffect(() => {
    if (count !== previous.current) {
      previous.current = count;
      setBump(true);
      const timer = setTimeout(() => setBump(false), 450);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [count]);

  if (!count) return null;
  return <span className={`count-badge ${accent ? "accent" : ""} ${bump ? "bump" : ""}`}>{count > 99 ? "99+" : count}</span>;
}

function UserMenu({ user, onLogout, loggingOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar user={user} />
      </button>

      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <strong>{user.fullName}</strong>
            <span className="muted small">{user.email}</span>
          </div>
          {user.role === "admin" && (
            <Link to="/admin" role="menuitem">
              <LayoutDashboard size={16} /> Admin panel
            </Link>
          )}
          <Link to="/account" role="menuitem">
            <User size={16} /> Account & addresses
          </Link>
          {user.role !== "admin" && (
            <>
              <Link to="/orders" role="menuitem">
                <Package size={16} /> My orders
              </Link>
              <Link to="/wishlist" role="menuitem">
                <Heart size={16} /> Wishlist
              </Link>
            </>
          )}
          <button type="button" role="menuitem" onClick={onLogout} disabled={loggingOut}>
            <LogOut size={16} /> {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { defaultAddress } = useAddresses();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  // Wishlist count comes from the backend (not global state). It is refreshed
  // on navigation and whenever a component announces a wishlist change.
  useEffect(() => {
    if (!user || user.role === "admin") return undefined;

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

  const navClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;
  // Admins don't shop: their store header is just Home + Admin
  const isAdmin = user?.role === "admin";

  return (
    <>
      <AnnouncementBar />
      <header className="nav">
        <div className="nav-inner">
          <Brand to={user ? "/home" : "/login"} />

          {user ? (
            <>
              <nav className={`nav-links ${menuOpen ? "open" : ""}`} aria-label="Main">
                <NavLink to="/home" className={navClass}>
                  Home
                </NavLink>
                {isAdmin ? (
                  <NavLink to="/admin" className={navClass}>
                    Admin
                  </NavLink>
                ) : (
                  <>
                    <NavLink to="/products" className={navClass} end>
                      Shop
                    </NavLink>
                    <NavLink to="/orders" className={navClass}>
                      Orders
                    </NavLink>
                  </>
                )}
              </nav>

              <span className="nav-spacer" />

              {!isAdmin && (
                <Link to="/account#addresses" className="deliver-chip" title="Change delivery address">
                  <MapPin size={16} />
                  <span>
                    <small>{defaultAddress ? `Deliver to ${firstName(defaultAddress.fullName)}` : "Delivering to"}</small>
                    <strong>{defaultAddress ? `${defaultAddress.city} ${defaultAddress.pincode}` : "Add an address"}</strong>
                  </span>
                </Link>
              )}

              <div className="nav-icons">
                {!isAdmin && (
                  <>
                    <NavLink
                      to="/wishlist"
                      className={({ isActive }) => `icon-btn ${isActive ? "active" : ""}`}
                      aria-label={`Wishlist, ${wishlistCount} items`}
                    >
                      <Heart size={20} strokeWidth={1.8} />
                      <CountBadge count={wishlistCount} accent />
                    </NavLink>
                    <NavLink
                      to="/cart"
                      className={({ isActive }) => `icon-btn ${isActive ? "active" : ""}`}
                      aria-label={`Bag, ${itemCount} items`}
                    >
                      <ShoppingBag size={20} strokeWidth={1.8} />
                      <CountBadge count={itemCount} />
                    </NavLink>
                  </>
                )}
                <UserMenu user={user} onLogout={handleLogout} loggingOut={loggingOut} />
                <button
                  type="button"
                  className="icon-btn menu-toggle"
                  aria-label="Toggle menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="nav-spacer" />
              <div className="nav-icons" style={{ gap: 8 }}>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-dark btn-sm">
                  Create account
                </Link>
              </div>
            </>
          )}
        </div>
      </header>
    </>
  );
}

export default Navbar;
