import express from "express";
import { getLeads, getLeadById, createLead, updateLead, deleteLead, addCommunication, importLeads } from "../controller/LeadController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.get("/",          protect, getLeads);
router.post("/",         protect, createLead);
router.post("/import/csv", protect, upload.single("file"), (req, res, next) => {
    // Large CSV imports can take several minutes — override socket timeout for this route only
    res.setTimeout(600000); // 10 min
    next();
}, importLeads);
router.get("/:id",       protect, getLeadById);
router.patch("/:id",     protect, updateLead);
router.delete("/:id",    protect, deleteLead);
router.post("/:id/communications", protect, addCommunication);

export default router;
