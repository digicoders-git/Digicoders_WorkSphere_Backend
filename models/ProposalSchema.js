import mongoose from "mongoose";

const ProposalSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    leadId:    { type: mongoose.Schema.Types.ObjectId, ref: "Lead",    required: true },
    templateId:{ type: mongoose.Schema.Types.ObjectId, ref: "ProposalTemplate", required: true },
    name:      { type: String, required: true, trim: true },
    pdfData:   { type: String, required: true },  // base64 of the filled PDF
    fieldValues: { type: mongoose.Schema.Types.Mixed, default: {} }, // snapshot of values used
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

ProposalSchema.index({ leadId: 1, companyId: 1 });

export default mongoose.model("Proposal", ProposalSchema);
