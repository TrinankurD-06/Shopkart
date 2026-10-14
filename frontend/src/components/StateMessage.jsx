// Used for empty and error states so no page ever shows a blank screen
function StateMessage({ icon, title, text, children, tone = "neutral" }) {
  return (
    <div className={`state-box state-${tone}`}>
      {icon && <div className="state-icon">{icon}</div>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children && <div className="state-actions">{children}</div>}
    </div>
  );
}

export default StateMessage;
