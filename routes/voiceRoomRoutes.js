const express = require('express');
const router = express.Router();
const { createRoom, joinRoom, leaveRoom, getRoomList, getRoomDetail } = require('../controllers/voiceRoomController');
const { authMiddleware } = require('../middleware/auth');

router.post('/create', authMiddleware, createRoom);
router.post('/join', authMiddleware, joinRoom);
router.post('/leave', authMiddleware, leaveRoom);
router.get('/list', authMiddleware, getRoomList);
router.get('/detail/:id', authMiddleware, getRoomDetail);

module.exports = router;
