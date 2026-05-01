import express from "express";
import { createWorkShift, getCompanyWorkShifts, getShiftsByCompany, updateWorkShift, deleteWorkShift, toggleWorkShiftStatus } from "../controller/WorkShiftController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("super_admin", "admin"), createWorkShift);
router.get("/company", protect, getCompanyWorkShifts);
router.get("/by-company/:companyId", protect, getShiftsByCompany);
router.put("/:id", protect, authorize("super_admin", "admin"), updateWorkShift);
router.delete("/:id", protect, authorize("super_admin", "admin"), deleteWorkShift);
router.patch("/:id/toggle", protect, authorize("super_admin", "admin"), toggleWorkShiftStatus);

export default router;
