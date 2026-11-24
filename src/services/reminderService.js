const prisma = require('../config/db');
const { sendEventReminder } = require('./emailService');

let timer;

async function sendUpcomingReminders() {
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tickets = await prisma.ticket.findMany({
    where: {
      scannedAt: null,
      event: {
        AND: [
          { status: 'APPROVED' },
          { isDraft: false },
          { startDate: { gt: now, lte: until } },
        ],
      },
    },
    include: {
      user: { select: { id: true, email: true } },
      event: { select: { id: true, title: true, startDate: true } },
    },
  });
  for (const ticket of tickets) {
    const dedupeKey = `event-reminder:${ticket.id}`;
    let notification = await prisma.notification.findUnique({ where: { dedupeKey } });
    try {
      if (!notification) {
        notification = await prisma.notification.create({
          data: {
            userId: ticket.user.id,
            type: 'EVENT_REMINDER',
            dedupeKey,
            payload: { eventId: ticket.event.id, eventTitle: ticket.event.title, startDate: ticket.event.startDate, emailSent: false },
          },
        });
      }
    } catch (error) {
      if (error.code === 'P2002') {
        notification = await prisma.notification.findUnique({ where: { dedupeKey } });
      } else {
        throw error;
      }
    }
    if (notification?.payload?.emailSent || !process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      continue;
    }
    try {
      const emailSent = await sendEventReminder(ticket.user.email, ticket.event.title, ticket.event.startDate);
      if (emailSent) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { payload: { ...notification.payload, emailSent: true, emailSentAt: new Date().toISOString() } },
        });
      }
    } catch (error) {
      console.error(`Reminder email failed for ticket ${ticket.id}:`, error.message);
    }
  }
}

function startReminderWorker() {
  if (process.env.DISABLE_REMINDER_WORKER === 'true' || timer) return;
  const run = () => sendUpcomingReminders().catch((error) => {
    console.error('Event reminder worker failed:', error);
  });
  timer = setInterval(run, 15 * 60 * 1000);
  timer.unref();
  run();
}

module.exports = { startReminderWorker, sendUpcomingReminders };
