const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getAllUsers,
  getCurrentUser,
  updateUser,
  deleteUser,
  completeUserGuide,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

// User routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes (require authentication)
router.get("/usersdata", authMiddleware, getAllUsers);
router.get("/user", authMiddleware, getCurrentUser);
router.put("/update", authMiddleware, updateUser);
router.delete("/delete", authMiddleware, deleteUser);
router.put("/complete-user-guide", authMiddleware, completeUserGuide);

module.exports = router;