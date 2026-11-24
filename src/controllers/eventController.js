const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { ensureClubManager } = require('../services/authorization');
const { normalizeBudgetProposal, proposalCreateData } = require('../services/budgetProposal');

const validateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
    throw new HttpError(400, 'A valid startDate must be earlier than endDate');
  }
  return { start, end };
};

const createEventProposal = asyncHandler(async (req, res) => {
  const { event: eventInput, budget: budgetInput } = req.body || {};
  if (!eventInput || typeof eventInput !== 'object') throw new HttpError(400, 'Event details are required');
  const { title, description, venue, startDate, endDate, clubId } = eventInput;
  if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'Event title is required');
  const parsedClubId = parseId(clubId, 'clubId');
  const { start, end } = validateRange(startDate, endDate);
  const proposal = normalizeBudgetProposal(budgetInput);
  await ensureClubManager(req.user, parsedClubId);

  const result = await prisma.$transaction(async (tx) => {
    const venueKey = typeof venue === 'string' && venue.trim() ? venue.trim().toLowerCase() : null;
    if (venueKey) {
      if (process.env.DATABASE_URL?.startsWith('postgres')) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`venue:${venueKey}`}))`;
      }
      const conflict = await tx.event.findFirst({
        where: {
          venueKey,
          isDraft: false,
          status: { not: 'REJECTED' },
          startDate: { lt: end },
          endDate: { gt: start },
        },
        select: { title: true },
      });
      if (conflict) throw new HttpError(409, `Venue time conflicts with event "${conflict.title}"`);
    }
    const event = await tx.event.create({
      data: {
        title: title.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
        venue: typeof venue === 'string' && venue.trim() ? venue.trim() : null,
        venueKey,
        startDate: start,
        endDate: end,
        clubId: parsedClubId,
        creatorId: req.user.id,
        status: 'PENDING',
        isDraft: false,
      },
    });
    const budgetProposal = await tx.budgetProposal.create({
      data: proposalCreateData({ clubId: parsedClubId, eventId: event.id, proposal, status: 'PENDING' }),
      include: { items: true },
    });
    return { event, budgetProposal };
  });
  res.status(201).json(result);
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
    include: {
      club: { select: { id: true, name: true } },
      budgetProposals: { select: { id: true, title: true, amount: true, status: true } },
    },
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
    const budgetProposal = await tx.budgetProposal.findUnique({ where: { eventId: id } });
    if (!budgetProposal) throw new HttpError(409, 'A linked budget proposal is required before submitting this event');
    if (!['DRAFT', 'PENDING'].includes(budgetProposal.status)) {
      throw new HttpError(409, 'The linked budget proposal is not ready for advisor review');
    }
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
    const updated = await tx.event.updateMany({
      where: { id, isDraft: true, status: 'PENDING' },
      data: { isDraft: false, status: 'PENDING' },
    });
    if (!updated.count) throw new HttpError(409, 'This event has already been submitted');
    if (budgetProposal.status === 'DRAFT') {
      const submittedBudget = await tx.budgetProposal.updateMany({
        where: { id: budgetProposal.id, status: 'DRAFT' },
        data: { status: 'PENDING' },
      });
      if (!submittedBudget.count) throw new HttpError(409, 'The linked budget proposal has already been submitted');
    }
    return tx.event.findUnique({ where: { id }, include: { club: true } });
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

module.exports = { createEventProposal, getEvents, getMyEvents, submitEvent, updateEvent };
