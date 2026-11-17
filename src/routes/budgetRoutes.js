const express = require('express');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const controller = require('../controllers/budgetController');

const router = express.Router();
router.use(verifyToken);
router.post('/', authorizeRoles('ADMIN', 'CLUB_EXECUTIVE'), controller.createProposal);
router.get('/clubs/:clubId', controller.getProposalsByClub);
router.post('/:proposalId/receipts', authorizeRoles('ADMIN', 'CLUB_EXECUTIVE'), controller.addReceipt);

module.exports = router;
