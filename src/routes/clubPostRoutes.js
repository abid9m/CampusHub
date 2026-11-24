const express = require('express');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { listClubPosts, createClubPost } = require('../controllers/clubPostController');

const router = express.Router();
router.get('/', listClubPosts);
router.post('/', verifyToken, authorizeRoles('ADMIN', 'CLUB_EXECUTIVE'), createClubPost);

module.exports = router;
