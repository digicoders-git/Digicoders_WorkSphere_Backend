import express from "express";
import {
    createTemplate, getTemplates, getTemplateById, updateTemplate, deleteTemplate,
    generateProposal, previewProposal,
    getProposalsByLead, getProposalById, deleteProposal,
    getLeadFields,
} from "../controller/proposalController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Lead field keys for mapping
router.get("/lead-fields", protect, getLeadFields);

// Templates
router.post("/templates",          protect, createTemplate);
router.get("/templates",           protect, getTemplates);
router.get("/templates/:id",       protect, getTemplateById);
router.patch("/templates/:id",     protect, updateTemplate);
router.delete("/templates/:id",    protect, deleteTemplate);

// Proposal generation
router.post("/generate",           protect, generateProposal);
router.post("/preview",            protect, previewProposal);

// Saved proposals
router.get("/lead/:leadId",        protect, getProposalsByLead);
router.get("/:id",                 protect, getProposalById);
router.delete("/:id",              protect, deleteProposal);

export default router;
