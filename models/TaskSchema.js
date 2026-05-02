import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema({
    name: { type: String },
    url: { type: String, required: true },
    publicId: { type: String },
    type: { type: String }, // image, video, raw (zip, pdf, etc.)
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
});

const CommentSchema = new mongoose.Schema({
    text: { type: String },
    attachments: [AttachmentSchema],
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
});

const AssignmentHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ["assigned", "removed"], required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
});

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ["todo", "in_progress", "review", "done"], default: "todo" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date },
    attachments: [AttachmentSchema],
    comments: [CommentSchema],
    assignmentHistory: [AssignmentHistorySchema],
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Task", TaskSchema);
