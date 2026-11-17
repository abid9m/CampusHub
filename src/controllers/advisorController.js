const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { ensureAdvisor } = require('../services/authorization');

const getPendingEvents = asyncHandler(async (req, res) => {
  const where = { isDraft: false, status: 'PENDING' };
  if (req.user.role !== 'ADMIN') where.club = { advisorId: req.user.id };
  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: { club: { select: { id: true, name: true, advisorId: true } }, creator: { select: { name: true } } },
  });
  res.json(events);
});

const updateEventStatus = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { status, feedback } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(status)) throw new HttpError(400, 'Status must be APPROVED or REJECTED');
  if (feedback !== undefined && typeof feedback !== 'string') throw new HttpError(400, 'Feedback must be text');
  const current = await prisma.event.findUnique({ where: { id } });
  if (!current || current.isDraft) throw new HttpError(404, 'Submitted event not found');
  if (current.status !== 'PENDING') throw new HttpError(409, 'Event has already been reviewed');
  await ensureAdvisor(req.user, current.clubId);

  const event = await prisma.$transaction(async (tx) => {
    if (status === 'APPROVED' && current.venue) {
      if (process.env.DATABASE_URL?.startsWith('postgres')) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`venue:${current.venueKey}`}))`;
      }
      const conflict = await tx.event.findFirst({
        where: {
          id: { not: current.id },
          venueKey: current.venueKey,
          isDraft: false,
          status: 'APPROVED',
          startDate: { lt: current.endDate },
          endDate: { gt: current.startDate },
        },
        select: { title: true },
      });
      if (conflict) throw new HttpError(409, `Cannot approve: venue conflicts with "${conflict.title}"`);
    }
    const updated = await tx.event.updateMany({
      where: { id, isDraft: false, status: 'PENDING' },
      data: { status, advisorNotes: feedback?.trim() || null },
    });
    if (!updated.count) throw new HttpError(409, 'Event has already been reviewed');
    return tx.event.findUnique({
      where: { id },
      include: { club: true, creator: { select: { id: true, email: true, name: true } } },
    });
  });
  await prisma.notification.create({
    data: {
      userId: event.creator.id,
      type: 'EVENT_STATUS',
      payload: { eventId: event.id, title: event.title, status, feedback: event.advisorNotes },
    },
  });
  res.json(event);
});

module.exports = { getPendingEvents, updateEventStatus };
