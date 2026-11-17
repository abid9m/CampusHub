const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');

const submitFeedback = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating must be an integer between 1 and 5');
  }
  if (req.body.comment !== undefined && typeof req.body.comment !== 'string') {
    throw new HttpError(400, 'Feedback comment must be text');
  }
  const attended = await prisma.ticket.findUnique({
    where: { eventId_userId: { eventId, userId: req.user.id } },
    select: { scannedAt: true },
  });
  if (!attended?.scannedAt) throw new HttpError(403, 'Only attendees can submit event feedback');
  const feedback = await prisma.feedback.create({
    data: { eventId, userId: req.user.id, rating, comment: req.body.comment || null },
  });
  res.status(201).json(feedback);
});

const getFeedbackForEvent = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const feedback = await prisma.feedback.findMany({
    where: { eventId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(feedback);
});

module.exports = { submitFeedback, getFeedbackForEvent };
