import express from "express";
import { getLeads, getLeadById, createLead, updateLead, deleteLead, addCommunication } from "../controller/LeadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/",          protect, getLeads);
router.get("/:id",       protect, getLeadById);
router.post("/",         protect, createLead);
router.patch("/:id",     protect, updateLead);
router.delete("/:id",    protect, deleteLead);
router.post("/:id/communications", protect, addCommunication);

export default router;
