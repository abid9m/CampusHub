const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { ensureClubManager } = require('../services/authorization');

const inviteCoHost = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.id);
  const clubId = parseId(req.body.clubId, 'clubId');
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'Event not found');
  await ensureClubManager(req.user, event.clubId);
  if (event.clubId === clubId) throw new HttpError(400, 'An event cannot invite its own club');
  const invitation = await prisma.coHostInvitation.create({
    data: { eventId, clubId, invitedById: req.user.id, note: req.body.note || null },
    include: { event: { select: { id: true, title: true } }, club: { select: { id: true, name: true } } },
  });
  const targetClub = await prisma.club.findUnique({ where: { id: clubId }, select: { leadId: true } });
  if (targetClub) {
    await prisma.notification.create({
      data: {
        userId: targetClub.leadId,
        type: 'COHOST_INVITATION',
        payload: { invitationId: invitation.id, eventTitle: event.title, clubId },
      },
    });
  }
  res.status(201).json(invitation);
});

const getInvitations = asyncHandler(async (req, res) => {
  const invitations = await prisma.coHostInvitation.findMany({
    where: req.user.role === 'ADMIN' ? {} : {
      OR: [
        { club: { leadId: req.user.id } },
        { club: { members: { some: { userId: req.user.id } } } },
      ],
    },
    include: { event: { select: { id: true, title: true, startDate: true } }, club: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(invitations);
});

const respondToInvitation = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { decision } = req.body;
  if (!['ACCEPTED', 'DECLINED'].includes(decision)) throw new HttpError(400, 'Decision must be ACCEPTED or DECLINED');
  const invitation = await prisma.coHostInvitation.findUnique({ where: { id } });
  if (!invitation) throw new HttpError(404, 'Invitation not found');
  await ensureClubManager(req.user, invitation.clubId);
  if (invitation.status !== 'PENDING') throw new HttpError(409, 'Invitation has already been answered');
  const updated = await prisma.coHostInvitation.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: decision, respondedAt: new Date() },
  });
  if (!updated.count) throw new HttpError(409, 'Invitation has already been answered');
  const result = await prisma.coHostInvitation.findUnique({
    where: { id },
    include: { event: { select: { id: true, title: true } } },
  });
  res.json(result);
});

module.exports = { inviteCoHost, getInvitations, respondToInvitation };
