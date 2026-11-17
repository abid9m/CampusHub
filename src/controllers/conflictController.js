const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');

const checkConflict = asyncHandler(async (req, res) => {
  const { venue, startDate, endDate, excludeEventId } = req.body;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (
    typeof venue !== 'string' ||
    !venue.trim() ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start >= end
  ) {
    throw new HttpError(400, 'A venue and valid time range are required');
  }
  const excludeId = excludeEventId ? parseId(excludeEventId, 'excludeEventId') : undefined;
  const where = {
    venueKey: venue.trim().toLowerCase(),
    isDraft: false,
    status: { not: 'REJECTED' },
    startDate: { lt: end },
    endDate: { gt: start },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };
  const conflicts = await prisma.event.findMany({
    where,
    select: { id: true, title: true, startDate: true, endDate: true, club: { select: { name: true } } },
    orderBy: { startDate: 'asc' },
  });
  const suggestions = [];
  const duration = end.getTime() - start.getTime();
  let candidate = new Date(start);
  for (let attempt = 0; conflicts.length && attempt < 8 && suggestions.length < 3; attempt += 1) {
    candidate = new Date(candidate.getTime() + 60 * 60 * 1000);
    const candidateEnd = new Date(candidate.getTime() + duration);
    const occupied = await prisma.event.findFirst({
      where: {
        ...where,
        startDate: { lt: candidateEnd },
        endDate: { gt: candidate },
      },
      select: { id: true },
    });
    if (!occupied) suggestions.push({ startDate: candidate.toISOString(), endDate: candidateEnd.toISOString() });
  }
  res.json({ conflict: conflicts.length > 0, conflicts, suggestions });
});

module.exports = { checkConflict };
