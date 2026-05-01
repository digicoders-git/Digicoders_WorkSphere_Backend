import express from 'express'
import { createCompany,createCompanyWithAdmin,updateCompanyWithAdmin, getCompanies, getAllCompanies, getCompanyById, updateCompany, deleteCompany, restoreCompany, toggleCompanyStatus,  } from '../controller/CompanyController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post("/", protect, authorize("super_admin"), createCompany)
router.post("/with-admin", protect, authorize("super_admin"), createCompanyWithAdmin)
router.get("/", protect,  getCompanies)
router.get("/all", protect, authorize("super_admin"), getAllCompanies)
router.get("/:id", protect, authorize("super_admin"), getCompanyById)
router.put("/:id", protect, authorize("super_admin"), updateCompany)
router.put("/:id/with-admin", protect, authorize("super_admin"), updateCompanyWithAdmin)
router.delete("/:id", protect, authorize("super_admin"), deleteCompany)
router.patch("/:id/status", protect, authorize("super_admin"), toggleCompanyStatus)

export default router
