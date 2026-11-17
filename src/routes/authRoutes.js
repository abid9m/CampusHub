const express = require('express');
const { register, login, me, setUserRole } = require('../controllers/authController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, me);
router.patch('/users/:id/role', verifyToken, authorizeRoles('ADMIN'), setUserRole);

module.exports = router;
