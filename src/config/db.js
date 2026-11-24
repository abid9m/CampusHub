const { PrismaClient } = require('@prisma/client');

// Single Prisma client -- Render uses prisma/schema.prisma (PostgreSQL).
// Locally, DATABASE_URL=file:./dev.db and the client is generated from schema.sqlite.prisma.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// SQLite compat: Json fields are stored as plain text strings, so we
// encode/decode them transparently via a middleware shim.
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
  prisma.$use(async (params, next) => {
    if (params.model === 'Notification' && params.args && params.args.data) {
      const encodePayload = (value) => {
        if (Array.isArray(value)) {
          value.forEach(encodePayload);
        } else if (value && typeof value === 'object') {
          for (const [key, nested] of Object.entries(value)) {
            if (key === 'payload' && nested !== null && typeof nested === 'object') {
              value[key] = JSON.stringify(nested);
            } else {
              encodePayload(nested);
            }
          }
        }
      };
      encodePayload(params.args.data);
    }

    const result = await next(params);
    if (params.model !== 'Notification') return result;

    const decodePayload = (notification) => {
      if (notification && typeof notification.payload === 'string') {
        try {
          notification.payload = JSON.parse(notification.payload);
        } catch (e) {
          // already an object or malformed -- leave as-is
        }
      }
      return notification;
    };
    return Array.isArray(result) ? result.map(decodePayload) : decodePayload(result);
  });
}

module.exports = prisma;
