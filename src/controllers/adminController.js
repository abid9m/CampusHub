const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { asyncHandler, HttpError } = require('../utils/http');

const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
  res.json(users);
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const allowedRoles = ['ADMIN', 'FACULTY_ADVISOR', 'CLUB_EXECUTIVE', 'STUDENT'];
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== 'string' || password.length < 10 || password.length > 72 ||
    !allowedRoles.includes(role)
  ) {
    throw new HttpError(400, 'Provide a valid name, email, role, and password (10-72 characters)');
  }
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: await bcrypt.hash(password, 12),
      role,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  res.status(201).json({ user });
});

module.exports = { getUsers, createUser };
