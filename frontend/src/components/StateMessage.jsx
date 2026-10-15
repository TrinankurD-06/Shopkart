// Used for empty and error states so no page ever shows a blank screen.
// `icon` is a lucide icon component, e.g. icon={ShoppingBag}
function StateMessage({ icon: Icon, title, text, children, tone = "neutral" }) {
  return (
    <div className={`state state-${tone}`}>
      {Icon && (
        <div className="state-icon">
          <Icon size={26} strokeWidth={1.6} />
        </div>
      )}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children && <div className="state-actions">{children}</div>}
    </div>
  );
}

export default StateMessage;
