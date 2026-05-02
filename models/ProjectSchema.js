import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ["active", "completed", "on_hold", "cancelled"], default: "active" },
    startDate: { type: Date },
    endDate: { type: Date },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Project", ProjectSchema);
