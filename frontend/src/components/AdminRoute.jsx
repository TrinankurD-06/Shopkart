import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "./Loader.jsx";

// Admin pages: logged-in accounts with role "admin" only. The API checks this too.
function AdminRoute() {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <Loader text="Checking your session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== "admin") return <Navigate to="/home" replace />;

  return <Outlet />;
}

export default AdminRoute;
