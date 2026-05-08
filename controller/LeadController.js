import Lead from "../models/LeadSchema.js";
import User from "../models/UserSchema.js";

const getReqUser = (userId) =>
    User.findById(userId).select("companyId role").populate("role", "name");

// ── helpers ───────────────────────────────────────────────────────────────────
const TRACKED = ["contactNumber","orgName","address","contactPerson","designation","cellNumber","email","status","assignedTo"];

const buildChanges = (old, body) => {
    const changes = {};
    for (const key of TRACKED) {
        if (body[key] === undefined) continue;
        const oldVal = old[key]?.toString?.() ?? old[key];
        const newVal = body[key]?.toString?.() ?? body[key];
        if (oldVal !== newVal) changes[key] = { from: oldVal ?? null, to: newVal };
    }
    return changes;
};

// ── GET /api/leads?search=&status=&assignedTo=&page=&limit= ───────────────────
export const getLeads = async (req, res) => {
    try {
        const reqUser = await getReqUser(req.user.userId);
        const { search, status, assignedTo, page = 1, limit = 20 } = req.query;

        const filter = { companyId: reqUser.companyId };
        if (search?.trim()) filter.contactNumber = { $regex: search.trim(), $options: "i" };
        if (status)     filter.status     = status;
        if (assignedTo) filter.assignedTo = assignedTo;

        const [leads, total] = await Promise.all([
            Lead.find(filter)
                .populate("assignedTo", "firstName lastName employeeCode profilePic")
                .populate("createdBy",  "firstName lastName")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            Lead.countDocuments(filter),
        ]);

        res.json({ leads, total, success: true });
    } catch (err) {
        res.status(500).json({ message: err.message, success: false });
    }
};

// ── GET /api/leads/:id ────────────────────────────────────────────────────────
export const getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate("assignedTo", "firstName lastName employeeCode profilePic")
            .populate("createdBy",  "firstName lastName")
            .populate("updatedBy",  "firstName lastName")
            .populate("history.changedBy", "firstName lastName")
            .populate("communications.addedBy", "firstName lastName");

        if (!lead) return res.status(404).json({ message: "Lead not found", success: false });
        res.json({ lead, success: true });
    } catch (err) {
        res.status(500).json({ message: err.message, success: false });
    }
};

// ── POST /api/leads ───────────────────────────────────────────────────────────
export const createLead = async (req, res) => {
    try {
        const reqUser = await getReqUser(req.user.userId);
        const { contactNumber, orgName, address, contactPerson, designation, cellNumber, email, status, assignedTo } = req.body;

        if (!contactNumber?.trim() || !orgName?.trim())
            return res.status(400).json({ message: "contactNumber and orgName are required", success: false });

        const lead = await Lead.create({
            companyId: reqUser.companyId,
            contactNumber: contactNumber.trim(),
            orgName: orgName.trim(),
            address, contactPerson, designation, cellNumber, email,
            status: status || "New Lead",
            assignedTo: assignedTo || null,
            createdBy: req.user.userId,
        });

        res.status(201).json({ lead, message: "Lead created", success: true });
    } catch (err) {
        res.status(500).json({ message: err.message, success: false });
    }
};

// ── PATCH /api/leads/:id ──────────────────────────────────────────────────────
export const updateLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: "Lead not found", success: false });

        const changes = buildChanges(lead, req.body);

        const fields = ["contactNumber","orgName","address","contactPerson","designation","cellNumber","email","status","assignedTo"];
        fields.forEach(f => { if (req.body[f] !== undefined) lead[f] = req.body[f]; });
        lead.updatedBy = req.user.userId;

        if (Object.keys(changes).length) {
            lead.history.push({ changedBy: req.user.userId, changedAt: new Date(), changes });
        }

        await lead.save();
        res.json({ lead, message: "Lead updated", success: true });
    } catch (err) {
        res.status(500).json({ message: err.message, success: false });
    }
};

// ── DELETE /api/leads/:id ─────────────────────────────────────────────────────
export const deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: "Lead not found", success: false });

        const reqUser = await getReqUser(req.user.userId);
        const isOwner = lead.createdBy?.toString() === req.user.userId;
        const isAdmin = ["admin", "super_admin"].includes(reqUser.role?.name);
        if (!isOwner && !isAdmin)
            return res.status(403).json({ message: "Not allowed", success: false });

        await lead.deleteOne();
        res.json({ message: "Lead deleted", success: true });
    } catch (err) {
        res.status(500).json({ message: err.message, success: false });
    }
};

// ── POST /api/leads/:id/communications ────────────────────────────────────────
export const addCommunication = async (req, res) => {
    try {
        const { subject, description } = req.body;
        if (!subject?.trim() || !description?.trim())
            return res.status(400).json({ message: "subject and description are required", success: false });

        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: "Lead not found", success: false });

        lead.communications.push({ subject: subject.trim(), description: description.trim(), addedBy: req.user.userId });
        lead.history.push({
            changedBy: req.user.userId,
            changedAt: new Date(),
            changes: { communication: { from: null, to: `Added: "${subject.trim()}"` } },
        });
        await lead.save();

        // Populate the newly added communication's addedBy
        await lead.populate("communications.addedBy", "firstName lastName");
        const comm = lead.communications[lead.communications.length - 1];
        res.status(201).json({ communication: comm, message: "Communication added", success: true });
    } catch (err) {
        res.status(500).json({ message: err.message, success: false });
    }
};
