const express = require("express");
const router = express.Router();
const { createContactTransaction, getContactTransactions } = require("../controllers/contactctrl");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/create", authMiddleware, createContactTransaction);
router.put("/create/:transactionId", authMiddleware, createContactTransaction);
router.get("/personal-contact", authMiddleware, getContactTransactions);

module.exports = router;
