const prisma = require('../config/db');
const { asyncHandler, HttpError, parseId } = require('../utils/http');
const { ensureClubManager } = require('../services/authorization');

const postInclude = {
  club: { select: { id: true, name: true } },
  author: { select: { id: true, name: true } },
  event: { select: { id: true, title: true, startDate: true, venue: true } },
};

const listClubPosts = asyncHandler(async (req, res) => {
  const posts = await prisma.clubPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: postInclude,
  });
  res.json(posts);
});

const createClubPost = asyncHandler(async (req, res) => {
  const { clubId, eventId, type = 'POST', title, content } = req.body || {};
  const parsedClubId = parseId(clubId, 'clubId');
  if (!['POST', 'ANNOUNCEMENT'].includes(type)) {
    throw new HttpError(400, 'Post type must be POST or ANNOUNCEMENT');
  }
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 140) {
    throw new HttpError(400, 'A title of 1 to 140 characters is required');
  }
  if (typeof content !== 'string' || !content.trim() || content.trim().length > 5000) {
    throw new HttpError(400, 'Content of 1 to 5000 characters is required');
  }

  await ensureClubManager(req.user, parsedClubId);
  let parsedEventId = null;
  if (eventId) {
    parsedEventId = parseId(eventId, 'eventId');
    const linkedEvent = await prisma.event.findUnique({
      where: { id: parsedEventId },
      select: { clubId: true, status: true, isDraft: true },
    });
    if (!linkedEvent || linkedEvent.clubId !== parsedClubId || linkedEvent.isDraft || linkedEvent.status !== 'APPROVED') {
      throw new HttpError(400, 'Posts can only link to an approved event from the selected club');
    }
  }

  const post = await prisma.clubPost.create({
    data: {
      clubId: parsedClubId,
      authorId: req.user.id,
      eventId: parsedEventId,
      type,
      title: title.trim(),
      content: content.trim(),
    },
    include: postInclude,
  });
  res.status(201).json(post);
});

module.exports = { listClubPosts, createClubPost };
