const prisma = require('../config/db');
const QRCode = require('qrcode');
const { sendRegistrationEmail } = require('../services/emailService');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { ensureClubManager, ensureAdvisor } = require('../services/authorization');

const registerForEvent = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'Event not found');
  if (event.status !== 'APPROVED' || event.isDraft) {
    throw new HttpError(409, 'Event registration is not open');
  }
  const ticket = await prisma.ticket.create({ data: { eventId, userId: req.user.id } });
  const qrCode = await QRCode.toDataURL(ticket.code, { errorCorrectionLevel: 'M', margin: 2 });
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
  let emailSent = false;
  try {
    emailSent = await sendRegistrationEmail(user.email, event.title, qrCode);
  } catch (error) {
    console.error('Ticket email delivery failed:', error.message);
  }
  await prisma.notification.create({
    data: {
      userId: req.user.id,
      type: 'EVENT_REGISTRATION',
      payload: { eventId, eventTitle: event.title, ticketId: ticket.id },
    },
  });
  res.status(201).json({
    message: 'Registration successful',
    ticket: { id: ticket.id, code: ticket.code, eventId, qrCode },
    emailSent,
  });
});

const getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { userId: req.user.id },
    include: { event: { select: { id: true, title: true, venue: true, startDate: true, endDate: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tickets);
});

const checkIn = asyncHandler(async (req, res) => {
  if (typeof req.body.code !== 'string' || !req.body.code.trim()) throw new HttpError(400, 'Ticket code is required');
  const ticket = await prisma.ticket.findUnique({
    where: { code: req.body.code.trim() },
    include: { event: { include: { club: true } }, user: { select: { name: true, email: true } } },
  });
  if (!ticket) throw new HttpError(404, 'Ticket not found');
  if (req.user.role === 'FACULTY_ADVISOR') await ensureAdvisor(req.user, ticket.event.clubId);
  else await ensureClubManager(req.user, ticket.event.clubId);
  if (ticket.event.status !== 'APPROVED') throw new HttpError(409, 'This event is not approved');
  const updated = await prisma.ticket.updateMany({
    where: { id: ticket.id, scannedAt: null },
    data: { scannedAt: new Date() },
  });
  if (!updated.count) throw new HttpError(409, 'Ticket has already been checked in');
  res.json({
    checkedIn: true,
    attendee: ticket.user.name,
    event: ticket.event.title,
    scannedAt: new Date().toISOString(),
  });
});

module.exports = { registerForEvent, getMyTickets, checkIn };
