const express = require("express");
const router = express.Router();
const { getNotifications, markNotificationAsRead } = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

// Get notifications for current user
router.get("/", authMiddleware, getNotifications);

// Mark notification as read
router.put("/:notificationId/read", authMiddleware, markNotificationAsRead);

module.exports = router; 