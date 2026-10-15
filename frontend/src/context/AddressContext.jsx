import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createAddress,
  deleteAddress,
  editAddress,
  fetchAddresses,
  getErrorMessage,
  makeDefaultAddress,
} from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

const AddressContext = createContext(null);

// The saved address book. Navbar ("Deliver to"), product page delivery estimate,
// checkout and the account page all read from here.
export function AddressProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id;

  const [addresses, setAddresses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const data = await fetchAddresses();
      setAddresses(data.addresses);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your addresses."));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      refresh();
    } else {
      setAddresses([]);
      setLoaded(false);
    }
  }, [userId, refresh]);

  // Each mutation returns the full, sorted list from the server
  const run = async (request) => {
    try {
      const data = await request();
      setAddresses(data.addresses);
      return { ok: true, message: data.message, address: data.address };
    } catch (err) {
      return { ok: false, message: getErrorMessage(err) };
    }
  };

  const save = (address, id) => run(() => (id ? editAddress(id, address) : createAddress(address)));
  const remove = (id) => run(() => deleteAddress(id));
  const setDefault = (id) => run(() => makeDefaultAddress(id));

  const defaultAddress = useMemo(() => addresses.find((address) => address.isDefault) || addresses[0] || null, [addresses]);

  return (
    <AddressContext.Provider value={{ addresses, defaultAddress, loaded, error, refresh, save, remove, setDefault }}>
      {children}
    </AddressContext.Provider>
  );
}

export const useAddresses = () => useContext(AddressContext);
