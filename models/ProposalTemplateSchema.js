import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema({
    key: { type: String, required: true },   // e.g. "orgName", "contactPerson", custom key
    label: { type: String, required: true },
    page: { type: Number, required: true },  // 0-indexed page number
    x: { type: Number, required: true },     // % of page width  (0-100)
    y: { type: Number, required: true },     // % of page height (0-100)
    fontSize: { type: Number, default: 12 },
    color: { type: String, default: "#000000" },
}, { _id: true });

const ProposalTemplateSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true, trim: true },
    pdfData: { type: String, required: true },   // base64-encoded PDF bytes
    pageCount: { type: Number, default: 1 },
    fields: [fieldSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

ProposalTemplateSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.model("ProposalTemplate", ProposalTemplateSchema);
