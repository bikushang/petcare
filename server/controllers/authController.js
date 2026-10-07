/**
 * Auth controller — login, me, change password, request reset, confirm reset.
 * Uses JWT for stateless sessions and bcryptjs for password hashing.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const Staff = require('../models/Staff');

const JWT_SECRET = process.env.JWT_SECRET || 'petcare-pro-dev-secret-change-in-production';
const JWT_EXPIRY = '7d';

function signToken(staffId) {
  return jwt.sign({ sub: staffId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Email and password are required' });
  }

  const staff = await Staff.findOne({ email: email.toLowerCase() });
  if (!staff) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }

  if (staff.status === 'Inactive' || staff.status === 'Suspended') {
    return res.status(403).json({ error: 'ACCOUNT_DISABLED', message: `Your account is ${staff.status.toLowerCase()}. Contact your administrator.` });
  }

  const valid = await bcrypt.compare(password, staff.password);
  if (!valid) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }

  staff.lastLogin = new Date();
  await staff.save();

  const token = signToken(staff._id);
  const user = staff.toSafeObject();

  res.json({ token, user });
});

const me = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.user.sub);
  if (!staff) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
  }
  res.json(staff.toSafeObject());
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'WEAK_PASSWORD', message: 'New password must be at least 6 characters' });
  }

  const staff = await Staff.findById(req.user.sub);
  if (!staff) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
  }

  const valid = await bcrypt.compare(currentPassword, staff.password);
  if (!valid) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' });
  }

  staff.password = await bcrypt.hash(newPassword, 10);
  await staff.save();
  res.json({ success: true, message: 'Password changed successfully' });
});

const requestReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'MISSING_EMAIL', message: 'Email is required' });
  }

  const staff = await Staff.findOne({ email: email.toLowerCase() });
  if (!staff) {
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
  }

  const token = require('crypto').randomBytes(32).toString('hex');
  staff.resetToken = token;
  staff.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  await staff.save();

  res.json({ success: true, message: 'If that email exists, a reset link has been sent', resetToken: token });
});

const confirmReset = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Token and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'WEAK_PASSWORD', message: 'New password must be at least 6 characters' });
  }

  const staff = await Staff.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  });

  if (!staff) {
    return res.status(400).json({ error: 'INVALID_TOKEN', message: 'Reset token is invalid or expired' });
  }

  staff.password = await bcrypt.hash(newPassword, 10);
  staff.resetToken = '';
  staff.resetTokenExpiry = null;
  if (staff.status === 'Suspended') staff.status = 'Active';
  await staff.save();

  res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
});

const updateStatus = asyncHandler(async (req, res) => {
  const requester = await Staff.findById(req.user.sub);
  if (!requester) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Requester not found' });
  }

  const canManage = ['Super Admin', 'Clinic Owner', 'Branch Manager'].includes(requester.role);
  if (!canManage) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'You do not have permission to manage account status' });
  }

  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Staff member not found' });
  }

  if (staff.role === 'Super Admin' && requester.role !== 'Super Admin') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot modify a Super Admin account' });
  }

  const { status } = req.body;
  if (!['Active', 'On leave', 'Inactive', 'Suspended'].includes(status)) {
    return res.status(400).json({ error: 'INVALID_STATUS', message: 'Invalid status value' });
  }

  staff.status = status;
  await staff.save();
  res.json(staff.toSafeObject());
});

module.exports = {
  login,
  me,
  changePassword,
  requestReset,
  confirmReset,
  updateStatus,
  signToken,
};
