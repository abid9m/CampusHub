// src/routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const { registerForEvent, getMyTickets, checkIn } = require('../controllers/ticketController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Register for an event and receive a QR ticket
router.post('/events/:eventId/register', verifyToken, registerForEvent);
router.get('/mine', verifyToken, getMyTickets);
router.post('/check-in', verifyToken, authorizeRoles('ADMIN', 'FACULTY_ADVISOR', 'CLUB_EXECUTIVE'), checkIn);

module.exports = router;
