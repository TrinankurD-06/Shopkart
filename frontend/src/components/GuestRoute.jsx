import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "./Loader.jsx";

// Login/Register pages: a logged-in account is sent on - admins to the admin panel
function GuestRoute() {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <Loader text="Loading..." />;
  if (user) {
    const fallback = user.role === "admin" ? "/admin" : "/home";
    return <Navigate to={location.state?.from || fallback} replace />;
  }

  return <Outlet />;
}

export default GuestRoute;
