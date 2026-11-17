const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');

const createClub = asyncHandler(async (req, res) => {
  const { name, description, leadId, advisorId } = req.body;
  if (typeof name !== 'string' || !name.trim()) throw new HttpError(400, 'Club name is required');
  const resolvedLeadId = leadId ? parseId(leadId, 'leadId') : req.user.id;
  const lead = await prisma.user.findUnique({ where: { id: resolvedLeadId }, select: { id: true, role: true } });
  if (!lead || !['ADMIN', 'CLUB_EXECUTIVE'].includes(lead.role)) {
    throw new HttpError(400, 'Club lead must be an administrator or club executive');
  }
  const resolvedAdvisorId = advisorId ? parseId(advisorId, 'advisorId') : null;
  if (resolvedAdvisorId) {
    const advisor = await prisma.user.findUnique({ where: { id: resolvedAdvisorId }, select: { role: true } });
    if (!advisor || advisor.role !== 'FACULTY_ADVISOR') throw new HttpError(400, 'Assigned advisor must have the faculty advisor role');
  }
  const club = await prisma.club.create({
    data: {
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : null,
      leadId: resolvedLeadId,
      advisorId: resolvedAdvisorId,
    },
    include: {
      lead: { select: { id: true, name: true } },
      advisor: { select: { id: true, name: true, email: true } },
    },
  });
  res.status(201).json(club);
});

const getClubs = asyncHandler(async (req, res) => {
  const clubs = await prisma.club.findMany({
    orderBy: { name: 'asc' },
    include: {
      lead: { select: { id: true, name: true } },
      advisor: { select: { id: true, name: true } },
      _count: { select: { members: true, events: true } },
    },
  });
  res.json(clubs);
});

const getMyClubs = asyncHandler(async (req, res) => {
  const where = req.user.role === 'ADMIN'
    ? {}
    : req.user.role === 'FACULTY_ADVISOR'
      ? { advisorId: req.user.id }
      : { OR: [{ leadId: req.user.id }, { members: { some: { userId: req.user.id } } }] };
  const clubs = await prisma.club.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      lead: { select: { id: true, name: true } },
      advisor: { select: { id: true, name: true } },
      _count: { select: { members: true, events: true } },
    },
  });
  res.json(clubs);
});

const getClubById = asyncHandler(async (req, res) => {
  const club = await prisma.club.findUnique({
    where: { id: parseId(req.params.id) },
    include: {
      lead: { select: { id: true, name: true } },
      advisor: { select: { id: true, name: true } },
      events: { where: { status: 'APPROVED', isDraft: false }, orderBy: { startDate: 'asc' } },
      members: {
        orderBy: { joinedAt: 'asc' },
        include: { user: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!club) throw new HttpError(404, 'Club not found');
  res.json(club);
});

const updateClub = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) data.name = req.body.name.trim();
  if (typeof req.body.description === 'string' || req.body.description === null) data.description = req.body.description;
  if (req.body.advisorId !== undefined) {
    const advisorId = Number(req.body.advisorId) || null;
    if (advisorId) {
      const advisor = await prisma.user.findUnique({ where: { id: parseId(advisorId, 'advisorId') }, select: { role: true } });
      if (!advisor || advisor.role !== 'FACULTY_ADVISOR') throw new HttpError(400, 'Assigned advisor must have the faculty advisor role');
    }
    data.advisorId = advisorId;
  }
  const club = await prisma.club.update({ where: { id }, data });
  res.json(club);
});

const deleteClub = asyncHandler(async (req, res) => {
  await prisma.club.delete({ where: { id: parseId(req.params.id) } });
  res.status(204).end();
});

module.exports = { createClub, getClubs, getMyClubs, getClubById, updateClub, deleteClub };
