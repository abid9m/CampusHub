const express = require('express');
const { verifyToken } = require('../middlewares/authMiddleware');
const { getNotifications, markAsRead } = require('../controllers/notificationController');

const router = express.Router();
router.use(verifyToken);
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

module.exports = router;
