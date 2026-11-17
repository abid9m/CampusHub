require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function ensureResource(name, type, description) {
  const existing = await prisma.resource.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.resource.create({ data: { name, type, description } });
}

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 10 characters before seeding');
  }
  const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL.trim().toLowerCase() },
    update: { role: 'ADMIN', name: ADMIN_NAME || 'CampusHub Administrator', password },
    create: {
      email: ADMIN_EMAIL.trim().toLowerCase(),
      password,
      name: ADMIN_NAME || 'CampusHub Administrator',
      role: 'ADMIN',
    },
  });
  await ensureResource('Main Auditorium', 'Venue', 'Campus main event hall');
  await ensureResource('Portable Projector', 'Equipment', 'Shared presentation projector');

  if (process.env.DATABASE_URL?.startsWith('file:')) {
    const admin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL.trim().toLowerCase() },
      select: { id: true },
    });
    const demoClub = await prisma.club.upsert({
      where: { name: 'CampusHub Demo Club' },
      update: {},
      create: {
        name: 'CampusHub Demo Club',
        description: 'A sample club to help you explore event discovery, registration and ticket check-in.',
        leadId: admin.id,
      },
    });
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    startDate.setHours(16, 0, 0, 0);
    const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);
    const venue = 'Main Auditorium';
    const existingDemoEvent = await prisma.event.findFirst({
      where: { clubId: demoClub.id, title: 'Campus Welcome Meetup' },
      select: { id: true },
    });
    const demoEventData = {
      description: 'A sample approved event. Register as a student to preview your QR ticket.',
      venue,
      venueKey: venue.toLowerCase(),
      startDate,
      endDate,
      status: 'APPROVED',
      isDraft: false,
    };
    if (existingDemoEvent) {
      await prisma.event.update({
        where: { id: existingDemoEvent.id },
        data: demoEventData,
      });
    } else {
      await prisma.event.create({
        data: {
          ...demoEventData,
          title: 'Campus Welcome Meetup',
          clubId: demoClub.id,
          creatorId: admin.id,
        },
      });
    }
  }
  console.log(`Administrator account ready: ${ADMIN_EMAIL.trim().toLowerCase()}`);
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
