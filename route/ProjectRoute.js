import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createProject, getProjects, getProjectById, updateProject, deleteProject } from "../controller/ProjectController.js";

const router = express.Router();

router.use(protect);

router.post("/", createProject);
router.get("/", getProjects);
router.get("/:id", getProjectById);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;
