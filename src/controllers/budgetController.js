const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { ensureAdvisor, ensureClubManager } = require('../services/authorization');

const createProposal = asyncHandler(async (req, res) => {
  const { title, amount, description, clubId, eventId, items } = req.body;
  const parsedClubId = parseId(clubId, 'clubId');
  const total = Number(amount);
  if (typeof title !== 'string' || !title.trim() || !Number.isFinite(total) || total <= 0) {
    throw new HttpError(400, 'A proposal title and positive amount are required');
  }
  await ensureClubManager(req.user, parsedClubId);
  if (eventId) {
    const linkedEvent = await prisma.event.findUnique({ where: { id: parseId(eventId, 'eventId') }, select: { clubId: true } });
    if (!linkedEvent || linkedEvent.clubId !== parsedClubId) throw new HttpError(400, 'The event must belong to the selected club');
  }
  if (!Array.isArray(items) || items.length === 0 || items.some((item) =>
    typeof item.description !== 'string' || !item.description.trim() ||
    !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0
  )) {
    throw new HttpError(400, 'At least one budget line item with a description and positive amount is required');
  }
  if (items?.length) {
    const itemTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
    if (Math.abs(itemTotal - total) > 0.01) throw new HttpError(400, 'Line item total must match the proposal amount');
  }
  const proposal = await prisma.budgetProposal.create({
    data: {
      clubId: parsedClubId,
      eventId: eventId ? Number(eventId) : null,
      title: title.trim(),
      amount: total,
      description: description || null,
      items: {
        create: (items || []).map((item) => ({
          description: item.description.trim(),
          amount: Number(item.amount),
        })),
      },
    },
    include: { items: true },
  });
  res.status(201).json(proposal);
});

const reviewProposal = asyncHandler(async (req, res) => {
  const proposalId = parseId(req.params.proposalId, 'proposal id');
  const { decision, notes } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new HttpError(400, 'Decision must be APPROVED or REJECTED');
  const proposal = await prisma.budgetProposal.findUnique({
    where: { id: proposalId },
    include: { club: { select: { id: true, leadId: true } } },
  });
  if (!proposal) throw new HttpError(404, 'Budget proposal not found');
  await ensureAdvisor(req.user, proposal.clubId);
  if (proposal.status !== 'PENDING') throw new HttpError(409, 'Proposal has already been reviewed');
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.budgetProposal.updateMany({
      where: { id: proposalId, status: 'PENDING' },
      data: { status: decision },
    });
    if (!updated.count) throw new HttpError(409, 'Proposal has already been reviewed');
    const approval = await tx.budgetApproval.create({
      data: { proposalId, advisorId: req.user.id, decision, notes: notes || null },
    });
    await tx.notification.create({
      data: {
        userId: proposal.club.leadId,
        type: 'BUDGET_UPDATE',
        payload: { proposalId, decision, title: proposal.title },
      },
    });
    const updatedProposal = await tx.budgetProposal.findUnique({ where: { id: proposalId } });
    return { approval, proposal: updatedProposal };
  });
  res.json(result);
});

const getProposalsByClub = asyncHandler(async (req, res) => {
  const clubId = parseId(req.params.clubId, 'club id');
  if (req.user.role === 'FACULTY_ADVISOR') await ensureAdvisor(req.user, clubId);
  else await ensureClubManager(req.user, clubId);
  const proposals = await prisma.budgetProposal.findMany({
    where: { clubId },
    include: { items: true, approvals: true, receipts: true, event: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(proposals);
});

const addReceipt = asyncHandler(async (req, res) => {
  const proposalId = parseId(req.params.proposalId, 'proposal id');
  const amount = Number(req.body.amount);
  const receiptUrl = req.body.receiptUrl;
  if (!Number.isFinite(amount) || amount <= 0 || typeof receiptUrl !== 'string' || !/^https:\/\/\S+$/i.test(receiptUrl)) {
    throw new HttpError(400, 'Provide a positive amount and an HTTPS receipt URL');
  }
  const proposal = await prisma.budgetProposal.findUnique({ where: { id: proposalId } });
  if (!proposal) throw new HttpError(404, 'Budget proposal not found');
  if (proposal.status !== 'APPROVED') throw new HttpError(409, 'Receipts can only be recorded against approved proposals');
  await ensureClubManager(req.user, proposal.clubId);
  const receipt = await prisma.expenseReceipt.create({
    data: { proposalId, amount, receiptUrl, description: req.body.description || null },
  });
  res.status(201).json(receipt);
});

module.exports = { createProposal, reviewProposal, getProposalsByClub, addReceipt };
