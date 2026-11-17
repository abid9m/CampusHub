const express = require('express');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { getPendingEvents } = require('../controllers/advisorController');
const { reviewProposal } = require('../controllers/budgetController');

const router = express.Router();
router.use(verifyToken, authorizeRoles('ADMIN', 'FACULTY_ADVISOR'));
router.get('/events', getPendingEvents);
router.patch('/budgets/:proposalId', reviewProposal);

module.exports = router;
