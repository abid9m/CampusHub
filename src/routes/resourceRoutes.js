// src/routes/resourceRoutes.js
const express = require('express');
const router = express.Router();
const { listResources, listResourceBookings, createResource, bookResource, cancelBooking } = require('../controllers/resourceController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/', listResources);
router.get('/:id/bookings', verifyToken, listResourceBookings);
router.post('/', verifyToken, authorizeRoles('ADMIN'), createResource);
router.post('/:id/book', verifyToken, bookResource);
router.delete('/bookings/:bookingId', verifyToken, cancelBooking);

module.exports = router;
