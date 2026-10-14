import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "./Loader.jsx";

// Login/Register pages: a logged-in customer is sent on (back to the page they wanted, or /home)
function GuestRoute() {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <Loader text="Loading..." />;
  if (user) return <Navigate to={location.state?.from || "/home"} replace />;

  return <Outlet />;
}

export default GuestRoute;
