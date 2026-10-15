import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Boxes, ExternalLink, LogOut, Menu, PackageOpen, X } from "lucide-react";
import Brand from "../../components/Brand.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { fetchAdminOrders, fetchInventory } from "../../services/api.js";
import { initials } from "../../utils/format.js";

// Separate shell for /admin: dark sidebar, no store navbar
function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState({ toConfirm: 0, lowStock: 0 });

  // Sidebar counters: paid orders waiting to be confirmed, products running low
  const refreshBadges = useCallback(() => {
    Promise.all([fetchAdminOrders({ status: "PLACED" }), fetchInventory({ level: "low" }), fetchInventory({ level: "out" })])
      .then(([placed, low, out]) => setBadges({ toConfirm: placed.count, lowStock: low.count + out.count }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.title = "Admin · ShopKart";
    return () => {
      document.title = "ShopKart — everyday goods, well chosen";
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <Brand to="/admin" />
        <button type="button" className="icon-btn" onClick={() => setOpen((value) => !value)} aria-label="Toggle admin menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside className={`admin-side ${open ? "open" : ""}`}>
        <Brand to="/admin" />
        <p className="admin-tag">Admin console</p>

        <nav className="admin-nav" aria-label="Admin">
          <NavLink to="/admin" end>
            <BarChart3 size={17} /> Analytics
          </NavLink>
          <NavLink to="/admin/orders">
            <PackageOpen size={17} /> Orders
            {badges.toConfirm > 0 && <span className="num" title="Placed orders waiting to be confirmed">{badges.toConfirm}</span>}
          </NavLink>
          <NavLink to="/admin/inventory">
            <Boxes size={17} /> Inventory
            {badges.lowStock > 0 && <span className="num" title="Products with 20 or fewer units">{badges.lowStock}</span>}
          </NavLink>
        </nav>

        <div className="admin-side-foot">
          <NavLink to="/home">
            <ExternalLink size={16} /> View store
          </NavLink>
          <button type="button" onClick={handleLogout}>
            <LogOut size={16} /> Log out
          </button>
          <div className="admin-user">
            <span className="avatar">{initials(user.fullName)}</span>
            <span>
              <strong>{user.fullName}</strong>
              <span style={{ opacity: 0.7 }}>{user.email}</span>
            </span>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet context={{ refreshBadges }} />
      </main>
    </div>
  );
}

export default AdminLayout;
