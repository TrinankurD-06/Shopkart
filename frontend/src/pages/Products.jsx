import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Search, SearchX, X } from "lucide-react";
import ProductCard from "../components/ProductCard.jsx";
import ProductSkeleton from "../components/ProductSkeleton.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { fetchCategories, fetchProducts, fetchWishlist } from "../services/api.js";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

function Products() {
  // Filters live in the URL, so /products?category=Books works from links and survives a refresh
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const sort = SORTS.some((option) => option.value === params.get("sort")) ? params.get("sort") : "newest";
  const urlSearch = params.get("q") || "";

  const [search, setSearch] = useState(urlSearch);
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [savedIds, setSavedIds] = useState(new Set());

  const updateParam = useCallback(
    (key, value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  // Wait until the user stops typing for 400ms before asking the backend
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== urlSearch) updateParam("q", search.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [search, urlSearch, updateParam]);

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories(["Books", "Electronics", "Fashion", "Home"]));

    // Count per category for the chips
    fetchProducts({})
      .then((data) => {
        const next = {};
        for (const product of data.products) next[product.category] = (next[product.category] || 0) + 1;
        next.all = data.products.length;
        setCounts(next);
      })
      .catch(() => {});

    // Which products are already in the wishlist (filled hearts on the cards)
    fetchWishlist()
      .then((data) => setSavedIds(new Set(data.wishlist.map((product) => product._id))))
      .catch(() => {});
  }, []);

  // Filtering happens on the backend: GET /products?search=&category=&sort=
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(false);

    const query = { sort };
    if (urlSearch) query.search = urlSearch;
    if (category) query.category = category;

    fetchProducts(query)
      .then((data) => !ignore && setProducts(data.products))
      .catch(() => !ignore && setError(true))
      .finally(() => !ignore && setLoading(false));

    return () => {
      ignore = true; // ignore responses from older, slower requests
    };
  }, [urlSearch, category, sort, reloadKey]);

  const handleWishlistChange = useCallback((productId, saved) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  const clearFilters = () => {
    setSearch("");
    setParams(sort !== "newest" ? { sort } : {}, { replace: true });
  };

  const heading = useMemo(() => {
    if (category) return category;
    if (sort === "popular") return "Bestsellers";
    return "The catalogue";
  }, [category, sort]);

  let content;
  if (loading) {
    content = <ProductSkeleton count={8} />;
  } else if (error) {
    content = (
      <StateMessage icon={AlertTriangle} tone="error" title="We couldn't load the products" text="Check your connection and try again.">
        <button type="button" className="btn btn-primary" onClick={() => setReloadKey((key) => key + 1)}>
          Try again
        </button>
      </StateMessage>
    );
  } else if (products.length === 0) {
    content = (
      <StateMessage icon={SearchX} title="Nothing matches that" text={urlSearch ? `No products found for “${urlSearch}”${category ? ` in ${category}` : ""}.` : "Try a different category."}>
        <button type="button" className="btn btn-outline" onClick={clearFilters}>
          Clear filters
        </button>
      </StateMessage>
    );
  } else {
    content = (
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} saved={savedIds.has(product._id)} onWishlistChange={handleWishlistChange} />
        ))}
      </div>
    );
  }

  return (
    <section>
      <div className="shop-head">
        <div>
          <p className="eyebrow">Shop</p>
          <h1>{heading}</h1>
        </div>
        <div className="chips" role="group" aria-label="Filter by category">
          <button type="button" className={`chip ${!category ? "on" : ""}`} onClick={() => updateParam("category", "")}>
            All {counts.all !== undefined && <span className="num">{counts.all}</span>}
          </button>
          {categories.map((name) => (
            <button key={name} type="button" className={`chip ${category === name ? "on" : ""}`} onClick={() => updateParam("category", category === name ? "" : name)}>
              {name} {counts[name] !== undefined && <span className="num">{counts[name]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <div className="search-input">
          <Search size={16} />
          <input type="search" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search products" />
        </div>
        <span className="result-line">
          {loading ? "Loading…" : `${products.length} result${products.length === 1 ? "" : "s"}`}
          {(urlSearch || category) && !loading && (
            <button type="button" className="link small" style={{ marginLeft: 12, textTransform: "none", letterSpacing: 0 }} onClick={clearFilters}>
              <X size={12} style={{ verticalAlign: "-1px" }} /> Clear
            </button>
          )}
        </span>
        <label className="sort-select">
          Sort
          <select value={sort} onChange={(event) => updateParam("sort", event.target.value === "newest" ? "" : event.target.value)}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {content}
    </section>
  );
}

export default Products;
