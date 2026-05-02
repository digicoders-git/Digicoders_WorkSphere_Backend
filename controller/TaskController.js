import Task from "../models/TaskSchema.js";
import Project from "../models/ProjectSchema.js";
import cloudinary from "../utills/cloudinary.js";
import { createNotification } from "../utills/notificationHelper.js";

const populateTask = (query) =>
    query
        .populate("assignedTo", "firstName lastName profilePic email")
        .populate("createdBy", "firstName lastName profilePic")
        .populate("comments.author", "firstName lastName profilePic")
        .populate("attachments.uploadedBy", "firstName lastName")
        .populate("comments.attachments.uploadedBy", "firstName lastName")
        .populate("assignmentHistory.user", "firstName lastName profilePic")
        .populate("assignmentHistory.by", "firstName lastName");

export const createTask = async (req, res) => {
    try {
        const { title, description, status, priority, assignedTo, dueDate, projectId } = req.body;

        const project = await Project.findOne({ _id: projectId, isDeleted: false });
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        const attachments = (req.files || []).map(f => ({
            name: f.originalname,
            url: f.path,
            publicId: f.filename,
            type: f.mimetype?.split("/")[0] || "raw",
            uploadedBy: req.user.userId,
        }));

        const assignedUsers = assignedTo ? (Array.isArray(assignedTo) ? assignedTo : [assignedTo]) : [];
        const initialHistory = assignedUsers.map(id => ({
            user: id, action: "assigned", by: req.user.userId,
        }));

        const task = await Task.create({
            title, description, status, priority, dueDate,
            project: projectId,
            assignedTo: assignedUsers,
            createdBy: req.user.userId,
            attachments,
            assignmentHistory: initialHistory,
        });

        const populated = await populateTask(Task.findById(task._id));
        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getTasksByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.userId;
        const isAdmin = req.user.role === "super_admin" || (req.user.permissions || []).some(p =>
            ["VIEW_ALL_TASKS", "CREATE_TASK"].includes(p)
        );

        const filter = { project: projectId, isDeleted: false };
        if (!isAdmin) filter.assignedTo = userId;

        const tasks = await populateTask(Task.find(filter).sort({ createdAt: -1 }));
        res.json({ success: true, data: tasks });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getTaskById = async (req, res) => {
    try {
        const task = await populateTask(Task.findOne({ _id: req.params.id, isDeleted: false }));
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const userId = req.user.userId;
        const isAdmin = req.user.role === "super_admin" || (req.user.permissions || []).some(p =>
            ["VIEW_ALL_TASKS", "CREATE_TASK"].includes(p)
        );
        const isAssigned = task.assignedTo.some(u => u._id.toString() === userId);
        const isCreator = task.createdBy._id.toString() === userId;

        if (!isAdmin && !isAssigned && !isCreator)
            return res.status(403).json({ success: false, message: "Access denied" });

        res.json({ success: true, data: task });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateTask = async (req, res) => {
    try {
        const { assignedTo, ...rest } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const historyEntries = [];
        const notifyAdded = [];
        const notifyRemoved = [];

        if (assignedTo !== undefined) {
            const newIds = (Array.isArray(assignedTo) ? assignedTo : [assignedTo]).map(String);
            const oldIds = task.assignedTo.map(String);

            const added = newIds.filter(id => !oldIds.includes(id));
            const removed = oldIds.filter(id => !newIds.includes(id));

            added.forEach(id => {
                historyEntries.push({ user: id, action: "assigned", by: req.user.userId });
                notifyAdded.push(id);
            });
            removed.forEach(id => {
                historyEntries.push({ user: id, action: "removed", by: req.user.userId });
                notifyRemoved.push(id);
            });

            rest.assignedTo = newIds;
        }

        const update = { ...rest };
        if (historyEntries.length) update.$push = { assignmentHistory: { $each: historyEntries } };

        await Task.findByIdAndUpdate(req.params.id, update);

        // Send notifications
        if (notifyAdded.length) {
            await createNotification({
                userId: notifyAdded,
                title: "You were assigned to a task",
                message: `You have been assigned to "${task.title}"`,
                type: "task_comment",
                link: `/projects/${task.project}`,
                createdBy: req.user.userId,
                metadata: { taskId: task._id, projectId: task.project },
            });
        }
        if (notifyRemoved.length) {
            await createNotification({
                userId: notifyRemoved,
                title: "You were removed from a task",
                message: `You have been removed from "${task.title}"`,
                type: "task_comment",
                link: `/projects/${task.project}`,
                createdBy: req.user.userId,
                metadata: { taskId: task._id, projectId: task.project },
            });
        }

        const populated = await populateTask(Task.findById(req.params.id));
        res.json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteTask = async (req, res) => {
    try {
        await Task.findByIdAndUpdate(req.params.id, { isDeleted: true });
        res.json({ success: true, message: "Task deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const attachments = (req.files || []).map(f => ({
            name: f.originalname,
            url: f.path,
            publicId: f.filename,
            type: f.mimetype?.split("/")[0] || "raw",
            uploadedBy: req.user.userId,
        }));

        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { $push: { comments: { text, attachments, author: req.user.userId } } },
            { new: true }
        ).populate("assignedTo", "_id").populate("createdBy", "_id").populate("project", "_id");

        // Notify all assigned users + task creator (except commenter)
        const recipients = [
            ...task.assignedTo.map(u => u._id.toString()),
            task.createdBy._id.toString(),
        ].filter((id, i, arr) => id !== req.user.userId && arr.indexOf(id) === i);

        if (recipients.length) {
            await createNotification({
                userId: recipients,
                title: "New comment on task",
                message: `${text ? text.slice(0, 80) : "A file was attached"} — on task "${task.title}"`,
                type: "task_comment",
                link: `/projects/${task.project._id}`,
                createdBy: req.user.userId,
                metadata: { taskId: task._id, projectId: task.project._id },
            });
        }

        const populated = await populateTask(Task.findById(task._id));
        res.json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const task = await Task.findById(id);
        const comment = task.comments.id(commentId);
        if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

        const isAuthor = comment.author.toString() === req.user.userId;
        const isAdmin = req.user.role === "super_admin" || (req.user.permissions || []).some(p =>
            ["DELETE_TASK", "CREATE_TASK"].includes(p)
        );
        if (!isAuthor && !isAdmin)
            return res.status(403).json({ success: false, message: "Not allowed" });

        // Delete comment attachments from cloudinary
        for (const att of comment.attachments) {
            if (att.publicId) await cloudinary.uploader.destroy(att.publicId, { resource_type: "raw" }).catch(() => {});
        }

        comment.deleteOne();
        await task.save();
        const populated = await populateTask(Task.findById(id));
        res.json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const addAttachment = async (req, res) => {
    try {
        const attachments = (req.files || []).map(f => ({
            name: f.originalname,
            url: f.path,
            publicId: f.filename,
            type: f.mimetype?.split("/")[0] || "raw",
            uploadedBy: req.user.userId,
        }));

        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { $push: { attachments: { $each: attachments } } },
            { new: true }
        );
        const populated = await populateTask(Task.findById(task._id));
        res.json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteAttachment = async (req, res) => {
    try {
        const { id, attachmentId } = req.params;
        const task = await Task.findById(id);
        const att = task.attachments.id(attachmentId);
        if (!att) return res.status(404).json({ success: false, message: "Attachment not found" });

        if (att.publicId) await cloudinary.uploader.destroy(att.publicId, { resource_type: "raw" }).catch(() => {});
        att.deleteOne();
        await task.save();
        res.json({ success: true, message: "Attachment deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMyTaskHistory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const tasks = await Task.find(
            { "assignmentHistory.user": userId, isDeleted: false },
            { title: 1, project: 1, status: 1, priority: 1, assignmentHistory: 1 }
        )
        .populate("project", "name")
        .populate("assignmentHistory.by", "firstName lastName")
        .sort({ updatedAt: -1 })
        .limit(20);

        // Return only this user's history entries per task
        const result = tasks.map(t => ({
            _id: t._id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            project: t.project,
            history: t.assignmentHistory
                .filter(h => h.user.toString() === userId)
                .sort((a, b) => new Date(b.at) - new Date(a.at)),
        }));

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
