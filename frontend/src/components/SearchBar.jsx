function SearchBar({ search, onSearchChange, category, onCategoryChange, categories, sort, onSortChange }) {
  return (
    <div className="search-bar">
      <input
        type="search"
        placeholder="Search products..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        aria-label="Search products"
      />

      <select value={category} onChange={(event) => onCategoryChange(event.target.value)} aria-label="Category">
        <option value="">All Categories</option>
        {categories.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select value={sort} onChange={(event) => onSortChange(event.target.value)} aria-label="Sort by">
        <option value="newest">Newest first</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>
    </div>
  );
}

export default SearchBar;
