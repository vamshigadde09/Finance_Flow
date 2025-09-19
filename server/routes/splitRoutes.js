const express = require("express");
const router = express.Router();
const { createGroup,
    getUserGroups,
    createGroupTransaction,
    getGroupTransactions,
    deleteGroupTransaction,
    getGroupBalances,
    updateSettleUpMode,
    getGroupDetails,
    updateSettlementStatus,
    getSettlementStatus,
    confirmSettlement,
    handleRejectedSettlements,
    getGroupSpendingSummary,
    getTotalBalances
} = require("../controllers/splitctrl");
const authMiddleware = require("../middleware/authMiddleware");


router.post("/create-group", authMiddleware, createGroup);
router.get("/groups/:userId", authMiddleware, getUserGroups);
router.get("/group/:groupId", authMiddleware, getGroupDetails);
router.post("/create-transaction", authMiddleware, createGroupTransaction);
router.get("/group-transactions", authMiddleware, getGroupTransactions);
router.delete("/group-transactions/:transactionId", authMiddleware, deleteGroupTransaction);
router.put('/update-settle-up-mode', authMiddleware, updateSettleUpMode);
router.get('/get-group-balances', authMiddleware, getGroupBalances);
router.get('/get-total-balances', authMiddleware, getTotalBalances);
router.put('/update-settlement-status', authMiddleware, updateSettlementStatus);
router.get('/settlement-status/:groupId/:userId', authMiddleware, getSettlementStatus);
router.put('/confirm-settlement', authMiddleware, confirmSettlement);
router.put('/handle-rejected-settlements', authMiddleware, handleRejectedSettlements);
router.get("/group-spending-summary", authMiddleware, getGroupSpendingSummary);


module.exports = router;