const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { ensureAdvisor } = require('../services/authorization');

const listResources = asyncHandler(async (req, res) => {
  const resources = await prisma.resource.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { bookings: true } } },
  });
  res.json(resources);
});

const listResourceBookings = asyncHandler(async (req, res) => {
  const resourceId = parseId(req.params.id, 'resource id');
  const resourceExists = await prisma.resource.findUnique({ where: { id: resourceId }, select: { id: true } });
  if (!resourceExists) throw new HttpError(404, 'Resource not found');
  const bookings = await prisma.resourceBooking.findMany({
    where: { resourceId, end: { gt: new Date() } },
    select: {
      id: true,
      start: true,
      end: true,
      event: { select: { title: true } },
    },
    orderBy: { start: 'asc' },
  });
  res.json(bookings);
});

const createResource = asyncHandler(async (req, res) => {
  const { name, type, description } = req.body;
  if (typeof name !== 'string' || !name.trim() || typeof type !== 'string' || !type.trim()) {
    throw new HttpError(400, 'Resource name and type are required');
  }
  const resource = await prisma.resource.create({
    data: { name: name.trim(), type: type.trim(), description: description || null },
  });
  res.status(201).json(resource);
});

const bookResource = asyncHandler(async (req, res) => {
  const resourceId = parseId(req.params.id, 'resource id');
  const start = new Date(req.body.start);
  const end = new Date(req.body.end);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
    throw new HttpError(400, 'Invalid time range');
  }
  const eventId = req.body.eventId ? parseId(req.body.eventId, 'eventId') : null;
  const booking = await prisma.$transaction(async (tx) => {
    if (process.env.DATABASE_URL?.startsWith('postgres')) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${resourceId})`;
    }
    const resource = await tx.resource.findUnique({ where: { id: resourceId } });
    if (!resource || !resource.isAvailable) throw new HttpError(404, 'Resource is unavailable');
    const conflict = await tx.resourceBooking.findFirst({
      where: { resourceId, start: { lt: end }, end: { gt: start } },
      select: { id: true },
    });
    if (conflict) throw new HttpError(409, 'Resource is already booked for that time range');
    if (eventId) {
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) throw new HttpError(404, 'Event not found');
      if (req.user.role === 'FACULTY_ADVISOR') await ensureAdvisor(req.user, event.clubId);
      else if (event.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new HttpError(403, 'Only the event organizer can attach a resource booking');
      }
    }
    return tx.resourceBooking.create({
      data: { resourceId, userId: req.user.id, eventId, start, end },
      include: { resource: true, event: { select: { id: true, title: true } } },
    });
  });
  res.status(201).json(booking);
});

const cancelBooking = asyncHandler(async (req, res) => {
  const id = parseId(req.params.bookingId, 'booking id');
  const booking = await prisma.resourceBooking.findUnique({ where: { id } });
  if (!booking) throw new HttpError(404, 'Booking not found');
  if (booking.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new HttpError(403, 'You cannot cancel this booking');
  }
  await prisma.resourceBooking.delete({ where: { id } });
  res.status(204).end();
});

module.exports = { listResources, listResourceBookings, createResource, bookResource, cancelBooking };
