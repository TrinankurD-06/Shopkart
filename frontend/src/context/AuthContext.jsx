import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getMe, logoutCustomer } from "../services/api.js";

const AuthContext = createContext(null);

// We never store the user in localStorage. The HttpOnly cookie is the session,
// and GET /customers/me tells us who is logged in.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch (error) {
      // 401 = not logged in. A network error keeps whatever we already knew.
      if (error.response) setUser(null);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutCustomer();
    } catch {
      // Even if the request fails, forget the user locally
    }
    setUser(null);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Session expired while using the app
  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener("shopkart:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("shopkart:unauthorized", handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider value={{ user, checking, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
