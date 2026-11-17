const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { sendCertificateEmail } = require('../services/emailService');

const generateCertificate = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const ticket = await prisma.ticket.findUnique({
    where: { eventId_userId: { eventId, userId: req.user.id } },
    include: { event: true, user: true },
  });
  if (!ticket) throw new HttpError(404, 'Event registration not found');
  if (!ticket.scannedAt) throw new HttpError(403, 'A checked-in ticket is required for a certificate');

  const existing = await prisma.certificate.findUnique({
    where: { eventId_userId: { eventId, userId: req.user.id } },
  });
  if (existing) {
    return res.json({
      certificateId: existing.id,
      verificationCode: existing.verificationCode,
      downloadUrl: `/api/certificates/${existing.id}/download`,
    });
  }

  const directory = path.resolve(__dirname, '../../storage/certificates');
  await fs.promises.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `certificate-${eventId}-${req.user.id}-${Date.now()}.pdf`);
  const verificationCode = randomUUID();
  const doc = new PDFDocument({ size: 'A4', margin: 64 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  doc.fontSize(30).text('Certificate of Attendance', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(16).text('This certificate is presented to', { align: 'center' });
  doc.moveDown();
  doc.fontSize(24).text(ticket.user.name, { align: 'center' });
  doc.moveDown();
  doc.fontSize(16).text(`for attending ${ticket.event.title}`, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(11).text(`Verify: ${process.env.APP_URL || 'http://localhost:5173'}/verify-certificate?code=${verificationCode}`, { align: 'center' });
  doc.end();
  await new Promise((resolve, reject) => {
    stream.once('finish', resolve);
    stream.once('error', reject);
  });

  const certificate = await prisma.certificate.create({
    data: { filePath, eventId, userId: req.user.id, verificationCode },
  });
  try {
    await sendCertificateEmail(ticket.user.email, filePath);
  } catch (error) {
    console.error('Certificate email delivery failed:', error.message);
  }
  res.status(201).json({
    certificateId: certificate.id,
    verificationCode: certificate.verificationCode,
    downloadUrl: `/api/certificates/${certificate.id}/download`,
  });
});

const verifyCertificate = asyncHandler(async (req, res) => {
  const certificate = await prisma.certificate.findUnique({
    where: { verificationCode: req.params.code },
    select: {
      verificationCode: true,
      issuedAt: true,
      user: { select: { name: true } },
      event: { select: { title: true, startDate: true } },
    },
  });
  if (!certificate) throw new HttpError(404, 'Certificate could not be verified');
  res.json({ valid: true, ...certificate });
});

const downloadCertificate = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'certificate id');
  const certificate = await prisma.certificate.findUnique({ where: { id } });
  if (!certificate) throw new HttpError(404, 'Certificate not found');
  if (certificate.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new HttpError(403, 'You cannot download this certificate');
  }
  res.download(certificate.filePath, path.basename(certificate.filePath));
});

module.exports = { generateCertificate, verifyCertificate, downloadCertificate };
