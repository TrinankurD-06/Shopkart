export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Express 5 forwards errors thrown in async handlers here automatically.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Request body is not valid JSON" });
  }

  if (err.name === "ValidationError") {
    const firstError = Object.values(err.errors)[0];
    return res.status(400).json({ success: false, message: firstError?.message || "Validation failed" });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: `Invalid value for ${err.path}` });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ success: false, message: `An account with this ${field} already exists` });
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Something went wrong on the server" });
};
