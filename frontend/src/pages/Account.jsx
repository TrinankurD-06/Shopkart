import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, MapPin, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useAddresses } from "../context/AddressContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { changePassword, getErrorMessage } from "../services/api.js";
import { formatDate } from "../utils/format.js";
import AddressForm from "../components/AddressForm.jsx";
import AddressText, { AddressLabel } from "../components/AddressText.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import Avatar from "../components/Avatar.jsx";

const MAX_ADDRESSES = 6;

function AddressBook() {
  const { user } = useAuth();
  const { addresses, loaded, error, save, remove, setDefault } = useAddresses();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null | "new" | address id
  const [busyId, setBusyId] = useState(null);

  const handleSave = async (values) => {
    const id = editing === "new" ? undefined : editing;
    const result = await save(values, id);
    if (result.ok) {
      setEditing(null);
      toast({ text: id ? "Address updated" : "Address saved" });
    }
    return result;
  };

  const act = async (id, action, success) => {
    setBusyId(id);
    const result = await action(id);
    setBusyId(null);
    toast(result.ok ? { text: success } : { text: result.message, tone: "error" });
  };

  const editingAddress = addresses.find((address) => address._id === editing);

  return (
    <div className="panel" id="addresses" style={{ scrollMarginTop: 100 }}>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Saved addresses</h2>
          <p className="panel-sub">Your default address is pre-selected at checkout and shown in the header.</p>
        </div>
        {!editing && addresses.length < MAX_ADDRESSES && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing("new")}>
            <Plus size={15} /> Add address
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {editing ? (
        <AddressForm
          key={editing}
          initial={editingAddress || { fullName: user.fullName, phone: user.phone, label: addresses.length ? "Work" : "Home" }}
          onSubmit={handleSave}
          onCancel={() => setEditing(null)}
          submitLabel={editing === "new" ? "Save address" : "Update address"}
        />
      ) : !loaded ? (
        <p className="muted small">Loading addresses…</p>
      ) : addresses.length === 0 ? (
        <button type="button" className="addr-new" style={{ width: "100%" }} onClick={() => setEditing("new")}>
          <span style={{ display: "grid", placeItems: "center", gap: 6 }}>
            <MapPin size={22} strokeWidth={1.6} />
            Add your first address — or let us find it with your location
          </span>
        </button>
      ) : (
        <div className="addr-list">
          {addresses.map((address) => (
            <div key={address._id} className={`addr-tile ${address.isDefault ? "is-default" : ""}`} style={busyId === address._id ? { opacity: 0.5 } : undefined}>
              <div className="addr-top">
                <AddressLabel label={address.label} isDefault={address.isDefault} />
              </div>
              <div>
                <AddressText address={address} />
              </div>
              <div className="addr-tile-actions">
                <button type="button" className="link" onClick={() => setEditing(address._id)} disabled={busyId !== null}>
                  Edit
                </button>
                {!address.isDefault && (
                  <button type="button" className="link" onClick={() => act(address._id, setDefault, "Default address updated")} disabled={busyId !== null}>
                    Set as default
                  </button>
                )}
                <button type="button" className="link link-danger" onClick={() => act(address._id, remove, "Address removed")} disabled={busyId !== null}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!editing && addresses.length >= MAX_ADDRESSES && (
        <p className="field-hint" style={{ marginTop: 12 }}>
          You can keep up to {MAX_ADDRESSES} addresses. Remove one to add another.
        </p>
      )}
    </div>
  );
}

function ChangePasswordForm({ hasPassword, onPasswordSet }) {
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [status, setStatus] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setStatus({ type: "", text: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if ((hasPassword && !form.oldPassword) || !form.newPassword) {
      return setStatus({ type: "error", text: hasPassword ? "Please fill in both passwords." : "Please choose a password." });
    }
    if (form.newPassword.length < 6) {
      return setStatus({ type: "error", text: "New password must be at least 6 characters." });
    }
    if (form.newPassword !== form.confirm) {
      return setStatus({ type: "error", text: "New passwords do not match." });
    }

    setSaving(true);
    try {
      const data = await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
      setStatus({ type: "success", text: data.message });
      setForm({ oldPassword: "", newPassword: "", confirm: "" });
      if (!hasPassword) onPasswordSet();
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">{hasPassword ? "Password" : "Set a password"}</h2>
          {!hasPassword && <p className="panel-sub">You sign in with Google. Add a password to also log in with your email.</p>}
        </div>
      </div>
      {status.text && (
        <div className={`alert alert-${status.type}`}>
          {status.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {status.text}
        </div>
      )}
      <div className="form-grid">
        {hasPassword && (
          <div className="field span-2">
            <label htmlFor="oldPassword">Current password</label>
            <PasswordInput id="oldPassword" name="oldPassword" value={form.oldPassword} onChange={handleChange} autoComplete="current-password" />
          </div>
        )}
        <div className="field">
          <label htmlFor="newPassword">New password</label>
          <PasswordInput id="newPassword" name="newPassword" value={form.newPassword} onChange={handleChange} autoComplete="new-password" />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm new password</label>
          <PasswordInput id="confirm" name="confirm" value={form.confirm} onChange={handleChange} autoComplete="new-password" />
        </div>
      </div>
      <button type="submit" className="btn btn-outline" disabled={saving}>
        {saving ? "Saving..." : hasPassword ? "Update password" : "Set password"}
      </button>
    </form>
  );
}

function Account() {
  const { user, refreshUser } = useAuth();

  // Always show fresh profile data from GET /customers/me
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>Account</h1>
        </div>
      </div>

      <div className="account-grid">
        <div className="panel profile-card sticky">
          <Avatar user={user} as="div" />
          <h2>{user.fullName}</h2>
          <p className="muted small" style={{ margin: 0 }}>
            {user.email}
          </p>
          <dl className="kv">
            <div>
              <dt>Mobile</dt>
              <dd className={user.phone ? "mono" : "muted"}>{user.phone ? `+91 ${user.phone}` : "Not added"}</dd>
            </div>
            {user.createdAt && (
              <div>
                <dt>Member since</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
            )}
            <div>
              <dt>Sign-in</dt>
              <dd>{user.signInMethods?.includes("google") ? (user.hasPassword ? "Google + password" : "Google") : "Email & password"}</dd>
            </div>
            <div>
              <dt>Account type</dt>
              <dd>{user.role === "admin" ? "Store admin" : "Customer"}</dd>
            </div>
          </dl>
          <div style={{ display: "grid", gap: 8, marginTop: 20 }}>
            {user.role !== "admin" && (
              <Link to="/orders" className="btn btn-outline btn-sm btn-block">
                My orders
              </Link>
            )}
            {user.role === "admin" && (
              <Link to="/admin" className="btn btn-dark btn-sm btn-block">
                Open admin panel
              </Link>
            )}
          </div>
        </div>

        <div className="stack">
          <AddressBook />
          <ChangePasswordForm hasPassword={user.hasPassword !== false} onPasswordSet={refreshUser} />
        </div>
      </div>
    </section>
  );
}

export default Account;
