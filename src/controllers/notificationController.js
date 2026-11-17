const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(notifications);
});

const markAsRead = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'notification id');
  const updated = await prisma.notification.updateMany({
    where: { id, userId: req.user.id },
    data: { read: true },
  });
  if (!updated.count) throw new HttpError(404, 'Notification not found');
  res.json({ id, read: true });
});

module.exports = { getNotifications, markAsRead };
