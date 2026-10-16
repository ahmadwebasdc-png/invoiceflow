function notFound(req, res) {
  res.status(404).json({ success: false, message: 'API route not found.' });
}
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 400;
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message: status >= 500 ? 'An unexpected server error occurred.' : err.message || 'The request could not be completed.' });
}
module.exports = { notFound, errorHandler };
