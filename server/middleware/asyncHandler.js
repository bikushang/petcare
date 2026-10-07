/**
 * Async wrapper to catch promise rejections in route handlers.
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
