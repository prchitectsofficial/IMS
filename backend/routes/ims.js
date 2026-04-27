const express = require('express');
const router = express.Router();
const db = require('../config/database');
const imsController = require('../controllers/imsController');

// ── YouTube / main routes ────────────────────────────────────────────────────
router.get('/test-db',             imsController.testDatabase);
router.get('/summary',             imsController.getSummary);
router.get('/filters/languages',   imsController.getLanguages);
router.get('/filters/countries',   imsController.getCountries);
router.get('/filters/add-languages', imsController.getAddLanguages);
router.get('/list',                imsController.getList);
router.get('/influencer/:id',      imsController.getInfluencerById);
router.get('/comments/:id',        imsController.getComments);
router.get('/similar/:id',         imsController.getSimilar);
router.post('/influencer/similar', imsController.postSimilarInfluencers);
router.post('/channel-details',    imsController.getChannelDetails);
router.post('/add',                imsController.addInfluencer);
router.put('/update/:id',          imsController.updateInfluencer);
router.delete('/influencer/:id',   imsController.deleteInfluencer);
router.post('/comments/:id',       imsController.addComment);
router.put('/comments/note/:noteId', imsController.updateAdminNote);
router.delete('/comments/:id',     imsController.deleteComment);

// ── Reindex ──────────────────────────────────────────────────────────────────
router.get('/reindex',               imsController.reindexAll);

// ── Instagram routes ─────────────────────────────────────────────────────────
router.get('/insta/list',              imsController.getInstaList);
router.get('/channel-promotions/:channel', imsController.getChannelPromotions);
router.get('/insta/influencer/:id',    imsController.getInstaInfluencerById);
router.post('/insta/add',            imsController.addInstaInfluencer);
router.put('/insta/update/:id',      imsController.updateInstaInfluencer);
router.get('/insta/comments/:id',    imsController.getInstaComments);
router.post('/insta/comments/:id',   imsController.addInstaComment);
router.delete('/insta/comments',     imsController.deleteInstaComment);

module.exports = router;
