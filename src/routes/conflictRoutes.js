const express = require('express');
const { checkConflict } = require('../controllers/conflictController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();
router.post('/check-conflict', verifyToken, authorizeRoles('ADMIN', 'FACULTY_ADVISOR', 'CLUB_EXECUTIVE'), checkConflict);

module.exports = router;
