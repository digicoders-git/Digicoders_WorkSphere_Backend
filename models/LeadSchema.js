import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
    changedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt:  { type: Date, default: Date.now },
    changes:    { type: Object }, // { field: { from, to } }
}, { _id: false });

const communicationSchema = new mongoose.Schema({
    subject:    { type: String, required: true },
    description:{ type: String, required: true },
    addedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addedAt:    { type: Date, default: Date.now },
}, { _id: true });

const LeadSchema = new mongoose.Schema({
    companyId:      { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    // Contact info
    contactNumber:  { type: String, required: true, trim: true },   // 10-digit, searchable
    orgName:        { type: String, required: true, trim: true },
    address:        { type: String, trim: true },
    contactPerson:  { type: String, trim: true },
    designation:    { type: String, trim: true },
    cellNumber:     { type: String, trim: true },
    email:          { type: String, trim: true },

    // Status
    status: {
        type: String,
        enum: ["New Lead", "Contacted", "Meeting Scheduled", "Proposal Sent",
               "Sent to Project Team", "Project Done", "On Hold", "Cancelled"],
        default: "New Lead",
    },

    // Assignment
    assignedTo:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Audit
    createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    history:        [historySchema],
    communications: [communicationSchema],
}, { timestamps: true });

LeadSchema.index({ companyId: 1, contactNumber: 1 });

export default mongoose.model("Lead", LeadSchema);
