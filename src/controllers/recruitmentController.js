const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { ensureClubManager } = require('../services/authorization');

const getExecutives = asyncHandler(async (req, res) => {
  const clubId = parseId(req.params.clubId, 'club id');
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      name: true,
      lead: { select: { id: true, name: true } },
      members: {
        where: { title: { not: 'Member' } },
        orderBy: { joinedAt: 'asc' },
        select: { title: true, user: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!club) throw new HttpError(404, 'Club not found');
  res.json(club);
});

const applyToClub = asyncHandler(async (req, res) => {
  const clubId = parseId(req.params.clubId, 'club id');
  const { name, email, studentId, message } = req.body;
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new HttpError(400, 'A valid name and email are required');
  }
  const clubExists = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
  if (!clubExists) throw new HttpError(404, 'Club not found');
  const application = await prisma.membershipApplication.create({
    data: {
      clubId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      studentId: typeof studentId === 'string' ? studentId.trim() : null,
      message: typeof message === 'string' ? message.trim() : null,
    },
  });
  res.status(201).json({ id: application.id, status: application.status });
});

const listApplications = asyncHandler(async (req, res) => {
  const clubId = parseId(req.params.clubId, 'club id');
  await ensureClubManager(req.user, clubId);
  const applications = await prisma.membershipApplication.findMany({
    where: { clubId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(applications);
});

const reviewApplication = asyncHandler(async (req, res) => {
  const id = parseId(req.params.applicationId, 'application id');
  const { status, userId, title } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(status)) throw new HttpError(400, 'Status must be APPROVED or REJECTED');
  const application = await prisma.membershipApplication.findUnique({ where: { id } });
  if (!application) throw new HttpError(404, 'Application not found');
  await ensureClubManager(req.user, application.clubId);
  if (application.status !== 'PENDING') throw new HttpError(409, 'Application has already been reviewed');
  const member = status === 'APPROVED'
    ? userId
      ? await prisma.user.findUnique({ where: { id: parseId(userId, 'userId') } })
      : await prisma.user.findUnique({ where: { email: application.email } })
    : null;
  if (status === 'APPROVED' && (!member || member.email !== application.email)) {
    throw new HttpError(404, 'The applicant must have a CampusHub account using the application email before approval');
  }
  const result = await prisma.$transaction(async (tx) => {
    const transition = await tx.membershipApplication.updateMany({
      where: { id, status: 'PENDING' },
      data: { status, reviewerId: req.user.id },
    });
    if (!transition.count) throw new HttpError(409, 'Application has already been reviewed');
    if (status === 'APPROVED') {
      await tx.clubMembership.upsert({
        where: { clubId_userId: { clubId: application.clubId, userId: member.id } },
        create: { clubId: application.clubId, userId: member.id, title: title || 'Member' },
        update: { title: title || 'Member' },
      });
    }
    return tx.membershipApplication.findUnique({ where: { id } });
  });
  res.json(result);
});

module.exports = { getExecutives, applyToClub, listApplications, reviewApplication };
