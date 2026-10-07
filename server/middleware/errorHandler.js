/**
 * Error handling middleware.
 * Catches errors passed via next(err) and returns a consistent JSON response.
 */
function errorHandler(err, req, res, next) {
  console.error('[error]', err.message);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Something went wrong',
  });
}

module.exports = errorHandler;
