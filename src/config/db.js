const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

if (process.env.DATABASE_URL?.startsWith('file:')) {
  prisma.$use(async (params, next) => {
    if (params.model === 'Notification' && params.args?.data) {
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
        notification.payload = JSON.parse(notification.payload);
      }
      return notification;
    };
    return Array.isArray(result) ? result.map(decodePayload) : decodePayload(result);
  });
}

module.exports = prisma;
