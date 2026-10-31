import mongoose from "mongoose";
import { contact } from "../models/contact.js";
import { deal, dealStages } from "../models/deal.js";
import { lead } from "../models/lead.js";

const defaultProbabilities = {
    Prospecting: 10,
    Qualification: 25,
    Proposal: 50,
    Negotiation: 75,
    Won: 100,
    Lost: 0,
};

const normalizeDealInput = (body = {}) => {
    const value = Number(body.value ?? 0);
    const stage = typeof body.stage === "string" ? body.stage.trim() : "";
    const probability = Number(body.probability ?? defaultProbabilities[stage] ?? 10);
    const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";

    if (typeof body.name !== "string" || !body.name.trim()) {
        return { error: "Deal name is required." };
    }
    if (!Number.isFinite(value) || value < 0) {
        return { error: "Deal value must be a non-negative number." };
    }
    if (!Number.isInteger(probability) || probability < 0 || probability > 100) {
        return { error: "Probability must be a whole number between 0 and 100." };
    }
    if (!dealStages.includes(stage)) {
        return { error: "Choose a valid deal stage." };
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
        return { error: "Currency must be a three-letter currency code." };
    }
    if (body.expectedCloseDate && Number.isNaN(new Date(body.expectedCloseDate).getTime())) {
        return { error: "Expected close date is invalid." };
    }

    return {
        values: {
            name: body.name.trim(),
            value,
            currency,
            stage,
            probability,
            expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
            contact: body.contactId || null,
            lead: body.leadId || null,
            notes: typeof body.notes === "string" ? body.notes.trim() : "",
        },
    };
};

const validateRelations = async (values, owners) => {
    if (values.contact && !mongoose.isValidObjectId(values.contact)) {
        return "Choose a valid contact.";
    }
    if (values.lead && !mongoose.isValidObjectId(values.lead)) {
        return "Choose a valid lead.";
    }
    const [ownedContact, ownedLead] = await Promise.all([
        values.contact
            ? contact.exists({ _id: values.contact, owner: { $in: owners }, mergedInto: null })
            : null,
        values.lead
            ? lead.exists({ _id: values.lead, user: { $in: owners } })
            : null,
    ]);
    if (values.contact && !ownedContact) return "The selected contact was not found in your workspace.";
    if (values.lead && !ownedLead) return "The selected lead was not found in your workspace.";
    return null;
};

const dealQuery = (owners) => deal.find({ owner: { $in: owners } })
    .populate("contact", "name company email phone")
    .populate("lead", "name company status")
    .populate("owner", "username email")
    .sort({ updatedAt: -1 })
    .lean();

export const getDeals = async (req, res) => {
    try {
        const data = await dealQuery(req.workspaceMemberIds);
        return res.status(200).json({ data });
    } catch (error) {
        console.error("Unable to load deals", error);
        return res.status(500).json({ message: "Unable to load deals." });
    }
};

export const createDeal = async (req, res) => {
    try {
        const normalized = normalizeDealInput(req.body);
        if (normalized.error) return res.status(400).json({ message: normalized.error });
        const relationError = await validateRelations(normalized.values, req.workspaceMemberIds);
        if (relationError) return res.status(400).json({ message: relationError });
        const created = await deal.create({ ...normalized.values, owner: req.user.userId });
        const data = await deal.findById(created._id)
            .populate("contact", "name company email phone")
            .populate("lead", "name company status")
            .populate("owner", "username email")
            .lean();
        return res.status(201).json({ data });
    } catch (error) {
        console.error("Unable to create deal", error);
        return res.status(500).json({ message: "Unable to create deal." });
    }
};

export const updateDeal = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid deal ID." });
        }
        const normalized = normalizeDealInput(req.body);
        if (normalized.error) return res.status(400).json({ message: normalized.error });
        const relationError = await validateRelations(normalized.values, req.workspaceMemberIds);
        if (relationError) return res.status(400).json({ message: relationError });
        const updated = await deal.findOneAndUpdate(
            { _id: req.params.id, owner: { $in: req.workspaceMemberIds } },
            normalized.values,
            { new: true, runValidators: true },
        )
            .populate("contact", "name company email phone")
            .populate("lead", "name company status")
            .populate("owner", "username email")
            .lean();
        if (!updated) return res.status(404).json({ message: "Deal not found." });
        return res.status(200).json({ data: updated });
    } catch (error) {
        console.error("Unable to update deal", error);
        return res.status(500).json({ message: "Unable to update deal." });
    }
};

export const deleteDeal = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid deal ID." });
        }
        const deleted = await deal.findOneAndDelete({ _id: req.params.id, owner: { $in: req.workspaceMemberIds } });
        if (!deleted) return res.status(404).json({ message: "Deal not found." });
        return res.status(200).json({ message: "Deal deleted." });
    } catch (error) {
        console.error("Unable to delete deal", error);
        return res.status(500).json({ message: "Unable to delete deal." });
    }
};
