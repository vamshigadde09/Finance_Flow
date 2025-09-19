const express = require("express");
const router = express.Router();
const { createTemplate, getGroupTemplates, getTransactionTemplates, updateTemplate, deleteTemplate } = require("../controllers/templatesctrl");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/create-template", authMiddleware, createTemplate);
router.get("/get-group-templates/:groupId", authMiddleware, getGroupTemplates);
router.get("/get-transaction-templates", authMiddleware, getTransactionTemplates);
router.put("/update-template", authMiddleware, updateTemplate);
router.delete("/delete-template", authMiddleware, deleteTemplate);
module.exports = router;
