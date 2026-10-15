// Placeholder cards with the same shape as the real grid, so nothing jumps when data arrives
function ProductSkeleton({ count = 8, className = "product-grid" }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="sk-card">
          <div className="skeleton" />
          <div className="skeleton sk-line" style={{ width: "40%" }} />
          <div className="skeleton sk-line" style={{ width: "85%" }} />
          <div className="skeleton sk-line" style={{ width: "30%" }} />
        </div>
      ))}
    </div>
  );
}

export default ProductSkeleton;
