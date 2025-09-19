const express = require("express");
const router = express.Router();
const { createPersonalTransaction, getAllTransactions, deleteTransaction } = require("../controllers/personalctrl");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/create", authMiddleware, createPersonalTransaction);
router.get("/get-all-transactions", authMiddleware, getAllTransactions);
router.delete("/delete-transaction/:transactionId", authMiddleware, deleteTransaction);

module.exports = router;
