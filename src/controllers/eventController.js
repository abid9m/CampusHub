const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { ensureClubManager } = require('../services/authorization');

const validateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
    throw new HttpError(400, 'A valid startDate must be earlier than endDate');
  }
  return { start, end };
};

const createEvent = asyncHandler(async (req, res) => {
  const { title, description, venue, startDate, endDate, clubId } = req.body;
  if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'Event title is required');
  const parsedClubId = parseId(clubId, 'clubId');
  const { start, end } = validateRange(startDate, endDate);
  await ensureClubManager(req.user, parsedClubId);
  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : null,
      venue: typeof venue === 'string' && venue.trim() ? venue.trim() : null,
      venueKey: typeof venue === 'string' && venue.trim() ? venue.trim().toLowerCase() : null,
      startDate: start,
      endDate: end,
      clubId: parsedClubId,
      creatorId: req.user.id,
      isDraft: true,
    },
    include: { club: true, creator: { select: { id: true, name: true } } },
  });
  res.status(201).json(event);
});

const getEvents = asyncHandler(async (req, res) => {
  const where = { status: 'APPROVED', isDraft: false };
  if (req.query.from || req.query.to) {
    where.startDate = {};
    if (req.query.from) {
      where.startDate.gte = new Date(req.query.from);
      if (!Number.isFinite(where.startDate.gte.getTime())) throw new HttpError(400, 'Invalid from date');
    }
    if (req.query.to) {
      where.startDate.lte = new Date(req.query.to);
      if (!Number.isFinite(where.startDate.lte.getTime())) throw new HttpError(400, 'Invalid to date');
    }
  }
  if (req.query.clubId) where.clubId = parseId(req.query.clubId, 'clubId');
  const events = await prisma.event.findMany({
    where,
    orderBy: { startDate: 'asc' },
    include: { club: { select: { id: true, name: true } }, _count: { select: { tickets: true } } },
  });
  res.json(events);
});

const getMyEvents = asyncHandler(async (req, res) => {
  const events = await prisma.event.findMany({
    where: req.user.role === 'ADMIN' ? {} : { creatorId: req.user.id },
    orderBy: { updatedAt: 'desc' },
    include: { club: { select: { id: true, name: true } } },
  });
  res.json(events);
});

const submitEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new HttpError(404, 'Event not found');
  await ensureClubManager(req.user, event.clubId);
  if (!event.isDraft) throw new HttpError(409, 'This event has already been submitted');

  const submitted = await prisma.$transaction(async (tx) => {
    if (event.venue) {
      if (process.env.DATABASE_URL?.startsWith('postgres')) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`venue:${event.venueKey}`}))`;
      }
      const conflict = await tx.event.findFirst({
        where: {
          id: { not: id },
          venueKey: event.venueKey,
          isDraft: false,
          status: { not: 'REJECTED' },
          startDate: { lt: event.endDate },
          endDate: { gt: event.startDate },
        },
        select: { id: true, title: true },
      });
      if (conflict) throw new HttpError(409, `Venue time conflicts with event "${conflict.title}"`);
    }
    return tx.event.update({
      where: { id },
      data: { isDraft: false, status: 'PENDING' },
      include: { club: true },
    });
  });
  res.json(submitted);
});

const updateEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Event not found');
  await ensureClubManager(req.user, existing.clubId);
  if (!existing.isDraft) throw new HttpError(409, 'Only drafts can be edited');
  const data = {};
  for (const key of ['title', 'description', 'venue']) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  if (req.body.venue !== undefined) {
    data.venueKey = typeof req.body.venue === 'string' && req.body.venue.trim()
      ? req.body.venue.trim().toLowerCase()
      : null;
  }
  if (req.body.startDate !== undefined || req.body.endDate !== undefined) {
    const range = validateRange(req.body.startDate ?? existing.startDate, req.body.endDate ?? existing.endDate);
    data.startDate = range.start;
    data.endDate = range.end;
  }
  const event = await prisma.event.update({ where: { id }, data });
  res.json(event);
});

module.exports = { createEvent, getEvents, getMyEvents, submitEvent, updateEvent };
