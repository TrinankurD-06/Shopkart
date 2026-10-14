import { useCallback, useEffect, useState } from "react";
import ProductCard from "../components/ProductCard.jsx";
import SearchBar from "../components/SearchBar.jsx";
import Loader from "../components/Loader.jsx";
import StateMessage from "../components/StateMessage.jsx";
import { fetchCategories, fetchProducts, fetchWishlist } from "../services/api.js";

function Products() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [categories, setCategories] = useState([]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [savedIds, setSavedIds] = useState(new Set());

  // Wait until the user stops typing for 400ms before asking the backend
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories(["Electronics", "Fashion", "Books", "Home"]));

    // Which products are already in the wishlist (to show ♥ on the cards)
    fetchWishlist()
      .then((data) => setSavedIds(new Set(data.wishlist.map((product) => product._id))))
      .catch(() => {});
  }, []);

  // Filtering happens on the backend: GET /products?search=&category=&sort=
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(false);

    const params = { sort };
    if (debouncedSearch) params.search = debouncedSearch;
    if (category) params.category = category;

    fetchProducts(params)
      .then((data) => !ignore && setProducts(data.products))
      .catch(() => !ignore && setError(true))
      .finally(() => !ignore && setLoading(false));

    return () => {
      ignore = true; // ignore responses from older, slower requests
    };
  }, [debouncedSearch, category, sort, reloadKey]);

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
    setDebouncedSearch("");
    setCategory("");
  };

  let content;
  if (loading) {
    content = <Loader text="Loading products..." />;
  } else if (error) {
    content = (
      <StateMessage icon="⚠️" tone="error" title="Something went wrong while loading products.">
        <button type="button" className="btn btn-primary" onClick={() => setReloadKey((key) => key + 1)}>
          Try Again
        </button>
      </StateMessage>
    );
  } else if (products.length === 0) {
    content = (
      <StateMessage icon="🔍" title="No products found." text="Try a different search term or category.">
        {(search || category) && (
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </StateMessage>
    );
  } else {
    content = (
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            saved={savedIds.has(product._id)}
            onWishlistChange={handleWishlistChange}
          />
        ))}
      </div>
    );
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          {!loading && !error && (
            <p className="muted">
              {products.length} product{products.length === 1 ? "" : "s"}
              {category ? ` in ${category}` : ""}
              {debouncedSearch ? ` matching "${debouncedSearch}"` : ""}
            </p>
          )}
        </div>
      </div>

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        sort={sort}
        onSortChange={setSort}
      />

      {content}
    </section>
  );
}

export default Products;
