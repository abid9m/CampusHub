const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { ensureAdvisor } = require('../services/authorization');

const getPendingEvents = asyncHandler(async (req, res) => {
  const where = { isDraft: false, status: 'PENDING' };
  if (req.user.role !== 'ADMIN') where.club = { advisorId: req.user.id };
  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      club: { select: { id: true, name: true, advisorId: true } },
      creator: { select: { name: true } },
      budgetProposals: { include: { items: true } },
    },
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
    const budgetProposal = await tx.budgetProposal.findUnique({
      where: { eventId: id },
      include: { club: { select: { leadId: true } } },
    });
    if (!budgetProposal || budgetProposal.status !== 'PENDING') {
      throw new HttpError(409, 'A pending linked budget proposal is required to review this event');
    }
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
    const updatedBudget = await tx.budgetProposal.updateMany({
      where: { id: budgetProposal.id, status: 'PENDING' },
      data: { status },
    });
    if (!updatedBudget.count) throw new HttpError(409, 'The linked budget proposal has already been reviewed');
    await tx.budgetApproval.create({
      data: {
        proposalId: budgetProposal.id,
        advisorId: req.user.id,
        decision: status,
        notes: feedback?.trim() || null,
      },
    });
    await tx.notification.create({
      data: {
        userId: budgetProposal.club.leadId,
        type: 'BUDGET_UPDATE',
        payload: { proposalId: budgetProposal.id, eventId: id, decision: status, title: budgetProposal.title },
      },
    });
    const updatedEvent = await tx.event.findUnique({
      where: { id },
      include: {
        club: true,
        creator: { select: { id: true, email: true, name: true } },
        budgetProposals: { include: { items: true } },
      },
    });
    await tx.notification.create({
      data: {
        userId: updatedEvent.creator.id,
        type: 'EVENT_STATUS',
        payload: { eventId: updatedEvent.id, title: updatedEvent.title, status, feedback: updatedEvent.advisorNotes },
      },
    });
    return updatedEvent;
  });
  res.json(event);
});

module.exports = { getPendingEvents, updateEventStatus };
