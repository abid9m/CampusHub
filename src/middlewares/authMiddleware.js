const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const verifyToken = (req, res, next) => {
  const header = req.get('authorization');
  const match = header && header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ message: 'A bearer token is required' });
  }

  try {
    const decoded = jwt.verify(match[1], process.env.JWT_SECRET);
    const userId = Number(decoded.sub);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true },
    }).then((user) => {
      if (!user) return res.status(401).json({ message: 'Account no longer exists' });
      req.user = user;
      return next();
    }).catch(next);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication is required' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  return next();
};

module.exports = { verifyToken, authorizeRoles };
