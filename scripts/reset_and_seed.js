console.warn('This legacy script no longer resets or deletes database records.');
console.warn('Starting the idempotent seed using ADMIN_EMAIL and ADMIN_PASSWORD from the environment.');
require('../prisma/seed');
