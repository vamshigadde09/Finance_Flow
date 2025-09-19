const express = require("express");
const router = express.Router();
const {
    createBankAccount,
    getBankAccounts,
    getBalanceTracker,
    getPrimaryBankAccount,
    setPrimaryBankAccount,
    unsetPrimaryBankAccount,
    updateBankAccount,
    deleteBankAccount
} = require("../controllers/bankaccountctrl");
const authMiddleware = require("../middleware/authMiddleware");

// Bank account routes
router.post("/create-bank-account", authMiddleware, createBankAccount);
router.get("/get-bank-accounts/:userId", authMiddleware, getBankAccounts);
router.get("/get-balance-tracker/:id", authMiddleware, getBalanceTracker);
router.get("/get-primary-account", authMiddleware, getPrimaryBankAccount);
router.patch("/set-primary-account/:bankAccountId", authMiddleware, setPrimaryBankAccount);
router.patch("/unset-primary-account", authMiddleware, unsetPrimaryBankAccount);
router.put("/update-bank-account/:bankAccountId", authMiddleware, updateBankAccount);
router.delete("/delete-bank-account/:bankAccountId", authMiddleware, deleteBankAccount);

module.exports = router;
