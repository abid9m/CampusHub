const express = require('express');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { getUsers, createUser } = require('../controllers/adminController');

const router = express.Router();
router.use(verifyToken, authorizeRoles('ADMIN'));
router.get('/users', getUsers);
router.post('/users', createUser);

module.exports = router;
