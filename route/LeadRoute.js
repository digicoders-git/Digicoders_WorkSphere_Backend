import express from "express";
import { getLeads, getLeadById, createLead, updateLead, deleteLead, addCommunication, importLeads, importBatch } from "../controller/LeadController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.get("/",          protect, getLeads);
router.post("/",         protect, createLead);
router.post("/import/batch", protect, importBatch);
router.post("/import/csv", protect, upload.single("file"), (req, res, next) => {
    res.setTimeout(600000);
    next();
}, importLeads);
router.get("/:id",       protect, getLeadById);
router.patch("/:id",     protect, updateLead);
router.delete("/:id",    protect, deleteLead);
router.post("/:id/communications", protect, addCommunication);

export default router;
