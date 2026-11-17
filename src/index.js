require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { HttpError } = require('./utils/http');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');
}

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new HttpError(403, 'Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/clubs', require('./routes/clubRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/events', require('./routes/conflictRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/cohosts', require('./routes/cohostRoutes'));
app.use('/api/advisor', require('./routes/advisorRoutes'));
app.use('/api/budgets', require('./routes/budgetRoutes'));
app.use('/api/recruitment', require('./routes/recruitmentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'Request body contains invalid JSON' });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error.code === 'P2002') {
    return res.status(409).json({ message: 'A record with these details already exists' });
  }
  if (error.code === 'P2003' || error.code === 'P2025') {
    return res.status(404).json({ message: 'The requested related record was not found' });
  }
  console.error('Unhandled API error:', error);
  return res.status(500).json({ message: 'An unexpected server error occurred' });
});

const server = app.listen(Number(process.env.PORT) || 5000, () => {
  console.log(`CampusHub API listening on port ${server.address().port}`);
  require('./services/reminderService').startReminderWorker();
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${process.env.PORT || 5000} is already in use. Stop the other CampusHub API process and try again.`);
  } else {
    console.error('CampusHub API failed to start:', error);
  }
  process.exitCode = 1;
});

const shutdown = async () => {
  server.close(async () => {
    await require('./config/db').$disconnect();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
