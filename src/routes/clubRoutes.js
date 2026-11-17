const express = require('express');
const controller = require('../controllers/clubController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();
router.get('/', controller.getClubs);
router.get('/mine', verifyToken, controller.getMyClubs);
router.get('/:id', controller.getClubById);
router.post('/', verifyToken, authorizeRoles('ADMIN', 'FACULTY_ADVISOR'), controller.createClub);
router.patch('/:id', verifyToken, authorizeRoles('ADMIN'), controller.updateClub);
router.delete('/:id', verifyToken, authorizeRoles('ADMIN'), controller.deleteClub);

module.exports = router;
