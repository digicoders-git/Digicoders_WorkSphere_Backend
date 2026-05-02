import Project from "../models/ProjectSchema.js";
import Task from "../models/TaskSchema.js";

export const createProject = async (req, res) => {
    try {
        const { name, description, status, startDate, endDate, members } = req.body;
        const project = await Project.create({
            name, description, status, startDate, endDate,
            members: members || [],
            companyId: req.user.company,
            createdBy: req.user.userId,
        });
        res.status(201).json({ success: true, data: project });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getProjects = async (req, res) => {
    try {
        const roleName = req.user.role;
        const isSuperAdmin = roleName === "super_admin";
        const isAdmin = isSuperAdmin || (req.user.permissions || []).some(p =>
            ["VIEW_ALL_PROJECTS", "CREATE_PROJECT"].includes(p)
        );
        const filter = { isDeleted: false };

        if (!isSuperAdmin) {
            filter.companyId = req.user.company;
            if (!isAdmin) {
                filter.$or = [
                    { members: req.user.userId },
                    { createdBy: req.user.userId },
                ];
            }
        }

        const projects = await Project.find(filter)
            .populate("createdBy", "firstName lastName profilePic")
            .populate("members", "firstName lastName profilePic")
            .sort({ createdAt: -1 });

        res.json({ success: true, data: projects });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getProjectById = async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, isDeleted: false })
            .populate("createdBy", "firstName lastName profilePic")
            .populate("members", "firstName lastName profilePic email");

        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        // Check access
        const userId = req.user.userId;
        const isAdmin = req.user.role === "super_admin" || (req.user.permissions || []).some(p =>
            ["VIEW_ALL_PROJECTS", "CREATE_PROJECT"].includes(p)
        );
        const isMember = project.members.some(m => m._id.toString() === userId);
        const isCreator = project.createdBy._id.toString() === userId;

        if (!isAdmin && !isMember && !isCreator)
            return res.status(403).json({ success: false, message: "Access denied" });

        res.json({ success: true, data: project });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: req.user.userId },
            { new: true }
        );
        res.json({ success: true, data: project });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteProject = async (req, res) => {
    try {
        await Project.findByIdAndUpdate(req.params.id, { isDeleted: true });
        await Task.updateMany({ project: req.params.id }, { isDeleted: true });
        res.json({ success: true, message: "Project deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
