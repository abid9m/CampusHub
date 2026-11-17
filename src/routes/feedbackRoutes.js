// src/routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();
const { submitFeedback, getFeedbackForEvent } = require('../controllers/feedbackController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/:eventId', verifyToken, submitFeedback);
router.get('/:eventId', getFeedbackForEvent);

module.exports = router;
