function Loader({ text = "Loading..." }) {
  return (
    <div className="state-box" role="status">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

export default Loader;
