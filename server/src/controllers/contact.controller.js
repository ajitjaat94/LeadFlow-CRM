import mongoose from "mongoose";
import { contact } from "../models/contact.js";
import { followUp } from "../models/followUp.js";
import { lead } from "../models/lead.js";
import { user } from "../models/user.models.js";

const normalizeTags = (tags) => [...new Set(
    (Array.isArray(tags) ? tags : [])
        .map((tag) => String(tag).trim().slice(0, 40))
        .filter(Boolean),
)].slice(0, 30);

const normalizeCustomFields = (fields) => {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};
    return Object.fromEntries(Object.entries(fields).slice(0, 100));
};

const normalizeContactInput = (body = {}) => ({
    name: typeof body.name === "string" ? body.name.trim() : "",
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    company: typeof body.company === "string" ? body.company.trim() : "",
    designation: typeof body.designation === "string" ? body.designation.trim() : "",
    city: typeof body.city === "string" ? body.city.trim() : "",
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    tags: normalizeTags(body.tags),
    customFields: normalizeCustomFields(body.customFields),
});

const phoneKey = (phone = "") => phone.replace(/\D/g, "");
const emailKey = (email = "") => email.trim().toLowerCase();

const addActivity = (record, type, description) => {
    record.activities.push({ type, description, createdAt: new Date() });
    if (record.activities.length > 100) record.activities.splice(0, record.activities.length - 100);
};

const findDuplicates = async (owners, values, excludeId) => {
    const normalizedPhone = phoneKey(values.phone);
    if (normalizedPhone.length >= 7) {
        const ownerContacts = await contact.find({
            owner: { $in: owners },
            archived: false,
            mergedInto: null,
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        })
            .select("_id name phone email company")
            .lean();
        return ownerContacts.filter((item) => (
            (Boolean(values.email) && emailKey(item.email) === emailKey(values.email))
            || phoneKey(item.phone) === normalizedPhone
        ));
    }
    if (!values.email) return [];
    return contact.find({
        owner: { $in: owners },
        archived: false,
        mergedInto: null,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        email: values.email,
    }).select("_id name phone email company").lean();
};

const ownedContact = (id, owners) => contact.findOne({ _id: id, owner: { $in: owners }, mergedInto: null });

const getContactRelations = async (record, owners) => {
    const linkedLeads = await lead.find({
        _id: { $in: record.leadIds },
        user: { $in: owners },
    }).select("name company email phone status createdAt").sort({ updatedAt: -1 }).lean();
    const followUps = linkedLeads.length
        ? await followUp.find({
            leadId: { $in: linkedLeads.map((item) => item._id) },
            createdBy: { $in: owners },
        }).sort({ scheduledDate: 1, scheduledTime: 1, createdAt: -1 }).lean()
        : [];
    return { linkedLeads, followUps };
};

export const getContacts = async (req, res) => {
    try {
        const query = { owner: { $in: req.workspaceMemberIds }, mergedInto: null };
        if (req.query.archived === "true") query.archived = true;
        else query.archived = false;
        const contacts = await contact.find(query)
            .populate("owner", "username email")
            .sort({ updatedAt: -1 })
            .lean();
        const leadIds = contacts.flatMap((item) => item.leadIds);
        const linkedLeads = leadIds.length
            ? await lead.find({ _id: { $in: leadIds }, user: { $in: req.workspaceMemberIds } }).select("_id name company").lean()
            : [];
        const leadsById = new Map(linkedLeads.map((item) => [String(item._id), item]));
        const pendingFollowUps = linkedLeads.length
            ? await followUp.find({
                leadId: { $in: linkedLeads.map((item) => item._id) },
                createdBy: { $in: req.workspaceMemberIds },
                status: "Pending",
            }).sort({ scheduledDate: 1, scheduledTime: 1 }).lean()
            : [];
        const nextFollowUpByLead = new Map();
        pendingFollowUps.forEach((item) => {
            if (!nextFollowUpByLead.has(String(item.leadId))) nextFollowUpByLead.set(String(item.leadId), item);
        });
        const data = contacts.map((item) => {
            const contactLeads = item.leadIds.map((id) => leadsById.get(String(id))).filter(Boolean);
            const nextFollowUps = contactLeads.map((linkedLead) => nextFollowUpByLead.get(String(linkedLead._id))).filter(Boolean);
            nextFollowUps.sort((a, b) => `${a.scheduledDate}T${a.scheduledTime}`.localeCompare(`${b.scheduledDate}T${b.scheduledTime}`));
            const next = nextFollowUps[0];
            return {
                ...item,
                linkedLeadCount: contactLeads.length,
                nextFollowUp: next ? {
                    scheduledDate: next.scheduledDate,
                    scheduledTime: next.scheduledTime,
                    type: next.type,
                } : null,
            };
        });
        return res.status(200).json({ data });
    } catch (error) {
        console.error("Unable to load contacts", error);
        return res.status(500).json({ message: "Unable to load contacts" });
    }
};

export const getContact = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid contact ID" });
        const record = await ownedContact(req.params.id, req.workspaceMemberIds);
        if (!record) return res.status(404).json({ message: "Contact not found" });
        const [{ linkedLeads, followUps }, populated] = await Promise.all([
            getContactRelations(record, req.workspaceMemberIds),
            contact.findById(record._id).populate("owner", "username email").lean(),
        ]);
        return res.status(200).json({ data: { ...populated, linkedLeads, followUps } });
    } catch (error) {
        console.error("Unable to load contact", error);
        return res.status(500).json({ message: "Unable to load contact" });
    }
};

export const createContact = async (req, res) => {
    try {
        const values = normalizeContactInput(req.body);
        if (!values.name) return res.status(400).json({ message: "Contact name is required" });
        const duplicates = await findDuplicates(req.workspaceMemberIds, values);
        if (duplicates.length) {
            return res.status(409).json({
                code: "CONTACT_DUPLICATE",
                message: "A contact with the same phone number or email already exists.",
                duplicates,
            });
        }
        const created = await contact.create({ ...values, owner: req.user.userId });
        addActivity(created, "created", "Contact created");
        await created.save();
        const data = await contact.findById(created._id).populate("owner", "username email").lean();
        return res.status(201).json({ data });
    } catch (error) {
        console.error("Unable to create contact", error);
        return res.status(500).json({ message: "Unable to create contact" });
    }
};

export const updateContact = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid contact ID" });
        const record = await ownedContact(req.params.id, req.workspaceMemberIds);
        if (!record) return res.status(404).json({ message: "Contact not found" });
        const values = normalizeContactInput(req.body);
        if (!values.name) return res.status(400).json({ message: "Contact name is required" });
        const duplicates = await findDuplicates(req.workspaceMemberIds, values, record._id);
        if (duplicates.length) {
            return res.status(409).json({
                code: "CONTACT_DUPLICATE",
                message: "Another contact with the same phone number or email already exists.",
                duplicates,
            });
        }
        Object.assign(record, values);
        addActivity(record, "updated", "Contact details updated");
        await record.save();
        const data = await contact.findById(record._id).populate("owner", "username email").lean();
        return res.status(200).json({ data });
    } catch (error) {
        console.error("Unable to update contact", error);
        return res.status(500).json({ message: "Unable to update contact" });
    }
};

export const linkContactLead = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.body.leadId)) {
            return res.status(400).json({ message: "Invalid contact or lead ID" });
        }
        const [record, linkedLead] = await Promise.all([
            ownedContact(req.params.id, req.workspaceMemberIds),
            lead.findOne({ _id: req.body.leadId, user: { $in: req.workspaceMemberIds } }).select("_id name company"),
        ]);
        if (!record) return res.status(404).json({ message: "Contact not found" });
        if (!linkedLead) return res.status(404).json({ message: "Lead not found" });
        if (record.leadIds.some((id) => String(id) === String(linkedLead._id))) {
            return res.status(409).json({ message: "This lead is already linked to the contact" });
        }
        record.leadIds.push(linkedLead._id);
        addActivity(record, "lead-linked", `Linked lead: ${linkedLead.name}`);
        await record.save();
        return res.status(200).json({ data: { lead: linkedLead, contactId: record._id } });
    } catch (error) {
        console.error("Unable to link lead to contact", error);
        return res.status(500).json({ message: "Unable to link this lead" });
    }
};

export const unlinkContactLead = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.leadId)) {
            return res.status(400).json({ message: "Invalid contact or lead ID" });
        }
        const record = await ownedContact(req.params.id, req.workspaceMemberIds);
        if (!record) return res.status(404).json({ message: "Contact not found" });
        const linkedLead = await lead.findOne({ _id: req.params.leadId, user: { $in: req.workspaceMemberIds } }).select("name");
        if (!linkedLead || !record.leadIds.some((id) => String(id) === String(linkedLead._id))) {
            return res.status(404).json({ message: "Linked lead not found" });
        }
        record.leadIds = record.leadIds.filter((id) => String(id) !== String(linkedLead._id));
        addActivity(record, "lead-unlinked", `Unlinked lead: ${linkedLead.name}`);
        await record.save();
        return res.status(200).json({ message: "Lead unlinked" });
    } catch (error) {
        console.error("Unable to unlink lead from contact", error);
        return res.status(500).json({ message: "Unable to unlink this lead" });
    }
};

export const setContactArchived = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid contact ID" });
        const record = await ownedContact(req.params.id, req.workspaceMemberIds);
        if (!record) return res.status(404).json({ message: "Contact not found" });
        record.archived = Boolean(req.body.archived);
        addActivity(record, record.archived ? "archived" : "restored", record.archived ? "Contact archived" : "Contact restored");
        await record.save();
        return res.status(200).json({ data: record });
    } catch (error) {
        console.error("Unable to update contact archive status", error);
        return res.status(500).json({ message: "Unable to update contact" });
    }
};

const mergeValues = (target, values) => {
    for (const field of ["name", "phone", "email", "company", "designation", "city"]) {
        if (!target[field] && values[field]) target[field] = values[field];
    }
    if (values.notes && !target.notes.includes(values.notes)) {
        target.notes = [target.notes, values.notes].filter(Boolean).join("\n\n");
    }
    target.tags = normalizeTags([...target.tags, ...values.tags]);
    const targetFields = Object.fromEntries(target.customFields || []);
    const sourceFields = values.customFields instanceof Map
        ? Object.fromEntries(values.customFields)
        : values.customFields || {};
    target.customFields = { ...sourceFields, ...targetFields };
};

export const mergeContact = async (req, res) => {
    try {
        const { sourceId } = req.body;
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(sourceId) || String(req.params.id) === String(sourceId)) {
            return res.status(400).json({ message: "Choose two different valid contacts" });
        }
        const [target, source] = await Promise.all([
            ownedContact(req.params.id, req.workspaceMemberIds),
            ownedContact(sourceId, req.workspaceMemberIds),
        ]);
        if (!target || !source) return res.status(404).json({ message: "Contact not found" });
        const sourceLeadIds = source.leadIds.map(String);
        target.leadIds = [...new Set([...target.leadIds.map(String), ...sourceLeadIds])];
        const sourceValues = source.toObject();
        sourceValues.customFields = Object.fromEntries(source.customFields || []);
        mergeValues(target, sourceValues);
        const sourceActivities = source.activities.map((item) => ({
            type: item.type,
            description: item.description,
            createdAt: item.createdAt,
        }));
        target.activities.push(...sourceActivities);
        target.activities.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        if (target.activities.length > 100) target.activities.splice(0, target.activities.length - 100);
        source.archived = true;
        source.mergedInto = target._id;
        addActivity(source, "merged", `Merged into ${target.name}`);
        addActivity(target, "merged", `Merged contact ${source.name}`);
        await Promise.all([target.save(), source.save()]);
        const data = await contact.findById(target._id).populate("owner", "username email").lean();
        return res.status(200).json({ data });
    } catch (error) {
        console.error("Unable to merge contacts", error);
        return res.status(500).json({ message: "Unable to merge contacts" });
    }
};

export const mergeDuplicateIntoContact = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid contact ID" });
        const target = await ownedContact(req.params.id, req.workspaceMemberIds);
        if (!target) return res.status(404).json({ message: "Contact not found" });
        const values = normalizeContactInput(req.body);
        if (!values.name) return res.status(400).json({ message: "Contact name is required" });
        const targetMatches = {
            phone: phoneKey(values.phone).length >= 7
                && phoneKey(target.phone) === phoneKey(values.phone),
            email: Boolean(values.email) && emailKey(target.email) === emailKey(values.email),
        };
        if (!targetMatches.phone && !targetMatches.email) {
            return res.status(409).json({ message: "This contact is no longer a duplicate. Refresh and try again." });
        }
        mergeValues(target, values);
        addActivity(target, "merged", `Merged duplicate details for ${values.name}`);
        await target.save();
        const data = await contact.findById(target._id).populate("owner", "username email").lean();
        return res.status(200).json({ data });
    } catch (error) {
        console.error("Unable to merge duplicate contact details", error);
        return res.status(500).json({ message: "Unable to merge duplicate details" });
    }
};

export const deleteContact = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid contact ID" });
        const record = await ownedContact(req.params.id, req.workspaceMemberIds);
        if (!record) return res.status(404).json({ message: "Contact not found" });
        const linkedLeadIds = record.leadIds;
        const linkedLeads = await lead.find({ _id: { $in: linkedLeadIds }, user: { $in: req.workspaceMemberIds } }).select("_id").lean();
        const linkedFollowUps = linkedLeads.length
            ? await followUp.countDocuments({ leadId: { $in: linkedLeads.map((item) => item._id) }, createdBy: { $in: req.workspaceMemberIds } })
            : 0;
        if ((linkedLeads.length || linkedFollowUps) && req.query.confirmLinked !== "true") {
            return res.status(409).json({
                code: "CONTACT_LINKED",
                linkedLeadCount: linkedLeads.length,
                followUpCount: linkedFollowUps,
                message: "This contact has linked leads or follow-ups. Confirm to delete only the contact; linked leads and follow-ups will be kept.",
            });
        }
        await contact.deleteOne({ _id: record._id, owner: { $in: req.workspaceMemberIds } });
        return res.status(200).json({
            message: "Contact deleted. Linked leads and follow-ups were kept.",
            linkedLeadCount: linkedLeads.length,
            followUpCount: linkedFollowUps,
        });
    } catch (error) {
        console.error("Unable to delete contact", error);
        return res.status(500).json({ message: "Unable to delete contact" });
    }
};

export const getContactOwners = async (req, res) => {
    try {
        const owners = await user.find({ _id: { $in: req.workspaceMemberIds } }).select("username email").sort({ username: 1 }).lean();
        return res.status(200).json({ data: owners });
    } catch (error) {
        console.error("Unable to load contact owners", error);
        return res.status(500).json({ message: "Unable to load contact owners" });
    }
};
