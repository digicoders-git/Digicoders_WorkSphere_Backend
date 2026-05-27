import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import ProposalTemplate from "../models/ProposalTemplateSchema.js";
import Proposal from "../models/ProposalSchema.js";
import Lead from "../models/LeadSchema.js";
import LeadFieldConfig from "../models/LeadFieldConfigSchema.js";

// ── helpers ──────────────────────────────────────────────────────────────────

const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
};

const buildLeadContext = (lead, fieldConfig = []) => {
    const ctx = {
        orgName:       lead.orgName       || "",
        contactPerson: lead.contactPerson || "",
        email:         lead.email         || "",
        contactNumber: lead.contactNumber || "",
        address:       lead.address       || "",
        status:        lead.status        || "",
    };
    const custom = lead.customFields instanceof Map
        ? Object.fromEntries(lead.customFields)
        : (lead.customFields || {});
    fieldConfig.forEach(f => { ctx[f.key] = custom[f.key] ?? ""; });
    return ctx;
};

const fillPdf = async (base64Pdf, fields, values) => {
    const pdfBytes = Buffer.from(base64Pdf, "base64");
    const pdfDoc   = await PDFDocument.load(pdfBytes);
    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages    = pdfDoc.getPages();

    for (const field of fields) {
        const page = pages[field.page];
        if (!page) continue;
        const { width, height } = page.getSize();
        const text  = String(values[field.key] ?? "");
        const x     = (field.x / 100) * width;
        const y     = height - (field.y / 100) * height;  // PDF y is bottom-up
        const color = hexToRgb(field.color || "#000000");
        page.drawText(text, { x, y, size: field.fontSize || 12, font, color });
    }

    const filled = await pdfDoc.save();
    return Buffer.from(filled).toString("base64");
};

// ── Template CRUD ─────────────────────────────────────────────────────────────

export const createTemplate = async (req, res) => {
    try {
        const { name, pdfData, pageCount, fields } = req.body;
        const companyId = req.user.company;
        const userId    = req.user.userId;

        if (!name?.trim())  return res.status(400).json({ message: "Template name is required" });
        if (!pdfData)       return res.status(400).json({ message: "PDF data is required" });

        const template = await ProposalTemplate.create({
            companyId, name: name.trim(), pdfData, pageCount: pageCount || 1,
            fields: fields || [], createdBy: userId,
        });
        res.status(201).json({ success: true, template });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed to create template" });
    }
};

export const getTemplates = async (req, res) => {
    try {
        const companyId = req.user.company;
        const templates = await ProposalTemplate.find({ companyId })
            .select("-pdfData")
            .sort({ createdAt: -1 });
        res.json({ success: true, templates });
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch templates" });
    }
};

export const getTemplateById = async (req, res) => {
    try {
        const companyId = req.user.company;
        const template  = await ProposalTemplate.findOne({ _id: req.params.id, companyId });
        if (!template) return res.status(404).json({ message: "Template not found" });
        res.json({ success: true, template });
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch template" });
    }
};

export const updateTemplate = async (req, res) => {
    try {
        const companyId = req.user.company;
        const { name, pdfData, pageCount, fields } = req.body;
        const template  = await ProposalTemplate.findOne({ _id: req.params.id, companyId });
        if (!template) return res.status(404).json({ message: "Template not found" });

        if (name)      template.name      = name.trim();
        if (pdfData)   { template.pdfData = pdfData; template.pageCount = pageCount || template.pageCount; }
        if (fields)    template.fields    = fields;
        await template.save();
        res.json({ success: true, template });
    } catch (e) {
        res.status(500).json({ message: "Failed to update template" });
    }
};

export const deleteTemplate = async (req, res) => {
    try {
        const companyId = req.user.company;
        await ProposalTemplate.findOneAndDelete({ _id: req.params.id, companyId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Failed to delete template" });
    }
};

// ── Proposal generation ───────────────────────────────────────────────────────

export const generateProposal = async (req, res) => {
    try {
        const { templateId, leadId, name, fieldValues } = req.body;
        const companyId = req.user.company;
        const userId    = req.user.userId;

        const template = await ProposalTemplate.findOne({ _id: templateId, companyId });
        if (!template) return res.status(404).json({ message: "Template not found" });

        const lead = await Lead.findOne({ _id: leadId, companyId });
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        const fieldConfigDoc = await LeadFieldConfig.findOne({ companyId }).lean();
        const fieldConfig    = fieldConfigDoc?.fields || [];
        const autoValues     = buildLeadContext(lead, fieldConfig);
        const values         = { ...autoValues, ...(fieldValues || {}) };

        const filledPdf = await fillPdf(template.pdfData, template.fields, values);

        const proposal = await Proposal.create({
            companyId, leadId, templateId,
            name: name?.trim() || template.name,
            pdfData: filledPdf,
            fieldValues: values,
            createdBy: userId,
        });

        res.status(201).json({ success: true, proposal: { ...proposal.toObject(), pdfData: filledPdf } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed to generate proposal" });
    }
};

// Preview: fill without saving
export const previewProposal = async (req, res) => {
    try {
        const { templateId, leadId, fieldValues } = req.body;
        const companyId = req.user.company;

        const template = await ProposalTemplate.findOne({ _id: templateId, companyId });
        if (!template) return res.status(404).json({ message: "Template not found" });

        const lead = await Lead.findOne({ _id: leadId, companyId });
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        const fieldConfigDoc = await LeadFieldConfig.findOne({ companyId }).lean();
        const fieldConfig    = fieldConfigDoc?.fields || [];
        const autoValues     = buildLeadContext(lead, fieldConfig);
        const values         = { ...autoValues, ...(fieldValues || {}) };

        const filledPdf = await fillPdf(template.pdfData, template.fields, values);
        res.json({ success: true, pdfData: filledPdf, values });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed to preview proposal" });
    }
};

// ── Saved proposals ───────────────────────────────────────────────────────────

export const getProposalsByLead = async (req, res) => {
    try {
        const companyId = req.user.company;
        const proposals = await Proposal.find({ leadId: req.params.leadId, companyId })
            .select("-pdfData")
            .populate("templateId", "name")
            .sort({ createdAt: -1 });
        res.json({ success: true, proposals });
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch proposals" });
    }
};

export const getProposalById = async (req, res) => {
    try {
        const companyId = req.user.company;
        const proposal  = await Proposal.findOne({ _id: req.params.id, companyId })
            .populate("templateId", "name fields pageCount");
        if (!proposal) return res.status(404).json({ message: "Proposal not found" });
        res.json({ success: true, proposal });
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch proposal" });
    }
};

export const deleteProposal = async (req, res) => {
    try {
        const companyId = req.user.company;
        await Proposal.findOneAndDelete({ _id: req.params.id, companyId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Failed to delete proposal" });
    }
};

// Return lead field keys available for mapping
export const getLeadFields = async (req, res) => {
    try {
        const companyId = req.user.company;
        const fieldConfigDoc = await LeadFieldConfig.findOne({ companyId }).lean();
        const custom = (fieldConfigDoc?.fields || []).map(f => ({ key: f.key, label: f.label }));
        const standard = [
            { key: "orgName",       label: "Organisation Name" },
            { key: "contactPerson", label: "Contact Person" },
            { key: "email",         label: "Email" },
            { key: "contactNumber", label: "Contact Number" },
            { key: "address",       label: "Address" },
            { key: "status",        label: "Lead Status" },
        ];
        res.json({ success: true, fields: [...standard, ...custom] });
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch lead fields" });
    }
};
