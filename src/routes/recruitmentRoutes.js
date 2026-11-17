const express = require('express');
const controller = require('../controllers/recruitmentController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();
router.get('/clubs/:clubId/executives', controller.getExecutives);
router.post('/clubs/:clubId/applications', controller.applyToClub);
router.get('/clubs/:clubId/applications', verifyToken, authorizeRoles('ADMIN', 'CLUB_EXECUTIVE'), controller.listApplications);
router.patch('/applications/:applicationId', verifyToken, authorizeRoles('ADMIN', 'CLUB_EXECUTIVE'), controller.reviewApplication);

module.exports = router;
