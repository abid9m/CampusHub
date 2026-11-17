// src/routes/certificateRoutes.js
const express = require('express');
const router = express.Router();
const { generateCertificate, verifyCertificate, downloadCertificate } = require('../controllers/certificateController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/verify/:code', verifyCertificate);
router.get('/:id/download', verifyToken, downloadCertificate);
router.post('/:eventId/generate', verifyToken, generateCertificate);

module.exports = router;
