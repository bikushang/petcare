/**
 * Auth middleware — JWT verification, role-based access control,
 * and branch-level access checks.
 */
const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');

const JWT_SECRET = process.env.JWT_SECRET || 'petcare-pro-dev-secret-change-in-production';

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'NO_TOKEN', message: 'Authentication required' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Session expired or invalid' });
  }
}

function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'NO_TOKEN', message: 'Authentication required' });

    const staff = await Staff.findById(req.user.sub);
    if (!staff) return res.status(401).json({ error: 'NOT_FOUND', message: 'User not found' });

    if (!roles.includes(staff.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }

    next();
  };
}

function requireBranchAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'NO_TOKEN', message: 'Authentication required' });

  Staff.findById(req.user.sub)
    .then((staff) => {
      if (!staff) return res.status(401).json({ error: 'NOT_FOUND', message: 'User not found' });

      if (staff.role === 'Super Admin') {
        req.staff = staff;
        return next();
      }

      const requestedBranch = req.query.branch || req.body.branch;
      if (!requestedBranch) {
        req.staff = staff;
        return next();
      }

      const hasAccess =
        staff.branch === requestedBranch ||
        (staff.branchAccess && staff.branchAccess.includes(requestedBranch)) ||
        staff.role === 'Clinic Owner';

      if (!hasAccess) {
        return res.status(403).json({ error: 'BRANCH_DENIED', message: 'You do not have access to this branch' });
      }

      req.staff = staff;
      next();
    })
    .catch((err) => next(err));
}

module.exports = { authRequired, requireRole, requireBranchAccess };
