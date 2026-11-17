const express = require('express');
const controller = require('../controllers/eventController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { updateEventStatus } = require('../controllers/advisorController');
const { inviteCoHost } = require('../controllers/cohostController');

const router = express.Router();
router.get('/', controller.getEvents);
router.get('/mine', verifyToken, controller.getMyEvents);
router.post('/', verifyToken, authorizeRoles('ADMIN', 'CLUB_EXECUTIVE'), controller.createEvent);
router.patch('/:id', verifyToken, authorizeRoles('ADMIN', 'CLUB_EXECUTIVE'), controller.updateEvent);
router.post('/:id/submit', verifyToken, authorizeRoles('ADMIN', 'CLUB_EXECUTIVE'), controller.submitEvent);
router.patch('/:id/status', verifyToken, authorizeRoles('ADMIN', 'FACULTY_ADVISOR'), updateEventStatus);
router.post('/:id/invitations', verifyToken, authorizeRoles('ADMIN', 'CLUB_EXECUTIVE'), inviteCoHost);

module.exports = router;
