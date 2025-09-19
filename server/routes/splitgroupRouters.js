const express = require("express");
const router = express.Router();
const { getMemberBalances, getGroupTransactions } = require("../controllers/splitgroupctrl");
const authMiddleware = require("../middleware/authMiddleware");


router.get("/group-transactions/summary", authMiddleware, getGroupTransactions);
router.get("/member-balances/:groupId", authMiddleware, getMemberBalances);
module.exports = router;
