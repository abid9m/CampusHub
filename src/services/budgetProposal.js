const { HttpError } = require('../utils/http');

function normalizeBudgetProposal(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const { title, description, amount, items } = source;
  const total = Number(amount);

  if (typeof title !== 'string' || !title.trim() || !Number.isFinite(total) || total <= 0) {
    throw new HttpError(400, 'A proposal title and positive amount are required');
  }
  if (!Array.isArray(items) || items.length === 0 || items.some((item) =>
    !item || typeof item !== 'object' ||
    typeof item.description !== 'string' || !item.description.trim() ||
    !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0
  )) {
    throw new HttpError(400, 'At least one budget line item with a description and positive amount is required');
  }

  const normalizedItems = items.map((item) => ({
    description: item.description.trim(),
    amount: Number(item.amount),
  }));
  const itemTotal = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
  if (Math.abs(itemTotal - total) > 0.01) {
    throw new HttpError(400, 'Line item total must match the proposal amount');
  }

  return {
    title: title.trim(),
    description: typeof description === 'string' && description.trim() ? description.trim() : null,
    amount: total,
    items: normalizedItems,
  };
}

function proposalCreateData({ clubId, eventId, proposal, status = 'DRAFT' }) {
  return {
    clubId,
    eventId,
    title: proposal.title,
    description: proposal.description,
    amount: proposal.amount,
    status,
    items: { create: proposal.items },
  };
}

module.exports = { normalizeBudgetProposal, proposalCreateData };
