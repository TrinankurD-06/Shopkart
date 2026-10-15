import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { AlertTriangle, Boxes, Check, PackageX, Search, TrendingDown } from "lucide-react";
import Loader from "../../components/Loader.jsx";
import StateMessage from "../../components/StateMessage.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchInventory, getErrorMessage, updateStock } from "../../services/api.js";
import { formatCompactPrice, formatNumber, formatPrice, handleImageError } from "../../utils/format.js";

const LOW_STOCK = 20;
const REFILL_TO = 100;

const LEVELS = [
  { value: "", label: "All" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Sold out" },
];

const matchesLevel = (product, level) => {
  if (level === "low") return product.stock > 0 && product.stock <= LOW_STOCK;
  if (level === "out") return product.stock === 0;
  return true;
};

function StockRow({ product, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => setValue(String(product.stock)), [product.stock]);

  const dirty = value !== String(product.stock);
  const parsed = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100000;

  const save = async (stock = parsed) => {
    setSaving(true);
    try {
      const data = await updateStock(product._id, stock);
      onSaved(data.product);
      setFlash(true);
      setTimeout(() => setFlash(false), 1600);
    } catch (err) {
      toast({ text: getErrorMessage(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const batch = Math.max(product.stock + product.sold, 1);
  const tone = product.stock === 0 ? "danger" : product.stock <= LOW_STOCK ? "warn" : "";

  return (
    <tr>
      <td>
        <div className="cell-product">
          <img src={product.image} alt="" onError={handleImageError} />
          <div>
            <strong>{product.name}</strong>
            <span className="cell-sub">{product.category}</span>
          </div>
        </div>
      </td>
      <td className="r mono num">{formatPrice(product.price)}</td>
      <td className="r mono num">{formatNumber(product.sold)}</td>
      <td className="stock-cell">
        <span className="mono" style={{ color: tone ? `var(--${tone === "warn" ? "saffron" : "danger"})` : undefined }}>
          {product.stock === 0 ? "Sold out" : `${formatNumber(product.stock)} left`}
        </span>
        <div className="meter">
          <div className={`meter-fill ${tone}`} style={{ width: `${(product.stock / batch) * 100}%` }} />
        </div>
      </td>
      <td>
        <form
          className="stock-edit"
          onSubmit={(event) => {
            event.preventDefault();
            if (dirty && valid) save();
          }}
        >
          <input
            type="number"
            min="0"
            max="100000"
            step="1"
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={dirty ? (valid ? "dirty" : "has-error") : ""}
            aria-label={`Stock for ${product.name}`}
          />
          {dirty ? (
            <>
              <button type="submit" className="btn btn-primary btn-xs" disabled={!valid || saving}>
                {saving ? "…" : "Save"}
              </button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setValue(String(product.stock))}>
                Reset
              </button>
            </>
          ) : flash ? (
            <span className="saved-flash">
              <Check size={13} /> Saved
            </span>
          ) : (
            <span className="quick-stock">
              <button type="button" className="btn btn-outline btn-xs" onClick={() => save(product.stock + 10)} disabled={saving} title="Add 10 units">
                +10
              </button>
              <button type="button" className="btn btn-outline btn-xs" onClick={() => save(product.stock + 50)} disabled={saving} title="Add 50 units">
                +50
              </button>
              {product.stock < REFILL_TO && (
                <button type="button" className="btn btn-outline btn-xs" onClick={() => save(REFILL_TO)} disabled={saving} title={`Set stock to ${REFILL_TO}`}>
                  Refill
                </button>
              )}
            </span>
          )}
        </form>
      </td>
    </tr>
  );
}

function Inventory() {
  const { refreshBadges } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const level = LEVELS.some((option) => option.value === params.get("level")) ? params.get("level") : "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetchInventory({})
      .then((data) => setProducts(data.products))
      .catch((err) => setError(getErrorMessage(err, "Could not load inventory.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = (updated) => {
    setProducts((list) => list.map((product) => (product._id === updated._id ? updated : product)));
    refreshBadges();
  };

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);

  const summary = useMemo(
    () => ({
      units: products.reduce((sum, product) => sum + product.stock, 0),
      value: products.reduce((sum, product) => sum + product.stock * product.price, 0),
      low: products.filter((product) => matchesLevel(product, "low")).length,
      out: products.filter((product) => matchesLevel(product, "out")).length,
    }),
    [products]
  );

  const visible = products.filter(
    (product) =>
      matchesLevel(product, level) &&
      (!category || product.category === category) &&
      (!search.trim() || product.name.toLowerCase().includes(search.trim().toLowerCase()))
  );

  if (loading) return <Loader text="Counting stock..." />;

  if (error) {
    return (
      <StateMessage icon={AlertTriangle} tone="error" title="Inventory didn't load" text={error}>
        <button type="button" className="btn btn-primary" onClick={load}>
          Try again
        </button>
      </StateMessage>
    );
  }

  return (
    <section>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Stock list</p>
          <h1>Inventory</h1>
        </div>
        <p className="muted small" style={{ margin: 0, maxWidth: 360 }}>
          Stock drops automatically when an order is paid and comes back if an order is cancelled.
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">
            <Boxes size={15} /> Units in stock
          </div>
          <div className="stat-value">{formatNumber(summary.units)}</div>
          <div className="stat-sub">across {products.length} products</div>
        </div>
        <div className="stat">
          <div className="stat-label">Stock value</div>
          <div className="stat-value">{formatCompactPrice(summary.value)}</div>
          <div className="stat-sub">at current retail prices</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <TrendingDown size={15} /> Running low
          </div>
          <div className="stat-value">{summary.low}</div>
          <div className="stat-sub">{LOW_STOCK} units or fewer</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <PackageX size={15} /> Sold out
          </div>
          <div className="stat-value">{summary.out}</div>
          <div className="stat-sub">can't be added to bags until restocked</div>
        </div>
      </div>

      <div className="filters">
        <div className="search-input">
          <Search size={16} />
          <input type="search" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search products" />
        </div>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="segmented" role="group" aria-label="Stock level">
          {LEVELS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={level === option.value ? "on" : ""}
              onClick={() => setParams(option.value ? { level: option.value } : {}, { replace: true })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <StateMessage icon={Boxes} title="Nothing to show" text={level === "low" ? "No products are running low." : level === "out" ? "Nothing is sold out." : "No products match your search."} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="r">Price</th>
                <th className="r">Sold</th>
                <th>In stock</th>
                <th>Update stock</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <StockRow key={product._id} product={product} onSaved={handleSaved} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Inventory;
