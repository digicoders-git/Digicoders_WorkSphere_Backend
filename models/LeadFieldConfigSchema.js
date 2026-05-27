import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema({
    key:      { type: String, required: true },
    label:    { type: String, required: true },
    type:     { type: String, required: true, enum: ["text", "number", "date", "dropdown", "table"] },
    required: { type: Boolean, default: false },
    options:  [{ label: String, value: String }],  // dropdown
    columns:  [{ key: String, label: String, type: { type: String, default: "text" } }], // table
    placeholder: { type: String, default: "" },
    order:    { type: Number, default: 0 },
}, { _id: false });

const LeadFieldConfigSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, unique: true },
    fields:    [fieldSchema],
}, { timestamps: true });

export default mongoose.model("LeadFieldConfig", LeadFieldConfigSchema);
