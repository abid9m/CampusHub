const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');

const publicUser = ({ id, email, role, name }) => ({ id, email, role, name });

const issueToken = (user) =>
  jwt.sign(
    { email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { subject: String(user.id), expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  if (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== 'string' ||
    password.length < 10 ||
    password.length > 72 ||
    typeof name !== 'string' ||
    !name.trim()
  ) {
    throw new HttpError(400, 'Provide a valid email, name, and password (10-72 characters)');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (exists) {
    throw new HttpError(409, 'An account with this email already exists');
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      name: name.trim(),
      role: 'STUDENT',
    },
  });
  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'Email and password are required');
  }
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  res.json({ token: issueToken(user), user: publicUser(user) });
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, role: true, name: true },
  });
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user });
});

const updateMe = asyncHandler(async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || !currentPassword) {
    throw new HttpError(400, 'Current password is required to update account settings');
  }
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    throw new HttpError(400, 'Name must be between 1 and 100 characters');
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new HttpError(400, 'A valid email address is required');
  }
  if (newPassword !== undefined && newPassword !== '' &&
      (typeof newPassword !== 'string' || newPassword.length < 10 || newPassword.length > 72)) {
    throw new HttpError(400, 'New password must be between 10 and 72 characters');
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { password: true },
  });
  if (!existingUser || !(await bcrypt.compare(currentPassword, existingUser.password))) {
    throw new HttpError(400, 'Current password is incorrect');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const data = { name: name.trim(), email: normalizedEmail };
  if (newPassword) data.password = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: { id: true, email: true, role: true, name: true },
  });
  res.json({ user });
});

const setUserRole = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'user id');
  if (!['ADMIN', 'FACULTY_ADVISOR', 'CLUB_EXECUTIVE', 'STUDENT'].includes(req.body.role)) {
    throw new HttpError(400, 'Invalid user role');
  }
  const existingUser = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!existingUser) throw new HttpError(404, 'User not found');
  if (id === req.user.id && req.body.role !== 'ADMIN') {
    const administratorCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (administratorCount <= 1) throw new HttpError(409, 'Promote another administrator before changing your own role');
  }
  const user = await prisma.user.update({
    where: { id },
    data: { role: req.body.role },
    select: { id: true, email: true, name: true, role: true },
  });
  res.json({ user });
});

module.exports = { register, login, me, updateMe, setUserRole };
