const express = require('express');
const { verifyToken } = require('../middlewares/authMiddleware');
const { getInvitations, respondToInvitation } = require('../controllers/cohostController');

const router = express.Router();
router.use(verifyToken);
router.get('/', getInvitations);
router.patch('/:id/respond', respondToInvitation);

module.exports = router;
