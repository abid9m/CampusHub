const prisma = require('../config/db');
const { HttpError } = require('../utils/http');

async function ensureClubManager(user, clubId) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new HttpError(404, 'Club not found');
  if (user.role === 'ADMIN' || club.leadId === user.id) return club;
  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId: user.id } },
  });
  if (user.role !== 'CLUB_EXECUTIVE' || !membership) {
    throw new HttpError(403, 'You must be a club executive to manage this club');
  }
  return club;
}

async function ensureAdvisor(user, clubId) {
  if (user.role === 'ADMIN') return;
  if (user.role !== 'FACULTY_ADVISOR') throw new HttpError(403, 'Advisor access is required');
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { advisorId: true } });
  if (!club || club.advisorId !== user.id) {
    throw new HttpError(403, 'You are not the assigned advisor for this club');
  }
}

module.exports = { ensureClubManager, ensureAdvisor };
