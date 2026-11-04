import { followUp } from "../models/followUp.js";
import { lead } from "../models/lead.js";

const followUpTypes = ["Call", "WhatsApp", "Email", "Meeting", "Other"];
const followUpStatuses = ["Pending", "Completed", "Cancelled"];

const isValidSchedule = (scheduledDate, scheduledTime, timeZone) => {
    if (typeof scheduledDate !== "string" || typeof scheduledTime !== "string"
        || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || !/^\d{2}:\d{2}$/.test(scheduledTime)) return false;
    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hour > 23 || minute > 59) return false;

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());
    const current = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${scheduledDate}T${scheduledTime}` > `${current.year}-${current.month}-${current.day}T${current.hour}:${current.minute}`;
};

const findWorkspaceLead = (leadId, memberIds) => lead.findOne({ _id: leadId, user: { $in: memberIds } }).select("_id name company email phone");

export const getFollowUps = async (req, res) => {
    try {
        const query = { createdBy: { $in: req.workspaceMemberIds } };
        if (req.query.status && followUpStatuses.includes(req.query.status)) query.status = req.query.status;
        const followUps = await followUp.find(query)
            .populate("leadId", "name company email phone")
            .sort({ scheduledDate: 1, scheduledTime: 1, createdAt: -1 });
        return res.status(200).json({ data: followUps });
    } catch (error) {
        return res.status(500).json({ message: "Unable to load follow-ups" });
    }
};

export const getLeadFollowUps = async (req, res) => {
    try {
        const ownedLead = await findWorkspaceLead(req.params.leadId, req.workspaceMemberIds);
        if (!ownedLead) return res.status(404).json({ message: "Lead not found" });
        const followUps = await followUp.find({ leadId: ownedLead._id, createdBy: { $in: req.workspaceMemberIds } })
            .populate("leadId", "name company email phone")
            .sort({ scheduledDate: 1, scheduledTime: 1 });
        return res.status(200).json({ data: followUps });
    } catch (error) {
        return res.status(500).json({ message: "Unable to load lead follow-ups" });
    }
};

export const createFollowUp = async (req, res) => {
    try {
        const { leadId, type, scheduledDate, scheduledTime, note = "" } = req.body;
        if (!leadId || !type || !scheduledDate || !scheduledTime) return res.status(400).json({ message: "Lead, type, date, and time are required" });
        if (!followUpTypes.includes(type)) return res.status(400).json({ message: "Invalid follow-up type" });
        if (!isValidSchedule(scheduledDate, scheduledTime, req.workspace.timeZone || "Asia/Kolkata")) return res.status(400).json({ message: "Follow-up date and time must be in the future in your workspace timezone" });
        const ownedLead = await findWorkspaceLead(leadId, req.workspaceMemberIds);
        if (!ownedLead) return res.status(404).json({ message: "Lead not found" });

        const created = await followUp.create({ leadId: ownedLead._id, createdBy: req.user.userId, type, scheduledDate, scheduledTime, note });
        const result = await followUp.findById(created._id).populate("leadId", "name company email phone");
        return res.status(201).json({ data: result });
    } catch (error) {
        return res.status(500).json({ message: "Unable to create follow-up" });
    }
};

export const updateFollowUp = async (req, res) => {
    try {
        const current = await followUp.findOne({ _id: req.params.id, createdBy: { $in: req.workspaceMemberIds } });
        if (!current) return res.status(404).json({ message: "Follow-up not found" });
        if (current.status !== "Pending") return res.status(400).json({ message: "Only pending follow-ups can be edited" });
        const { type, scheduledDate, scheduledTime, note = "" } = req.body;
        if (!followUpTypes.includes(type) || !isValidSchedule(scheduledDate, scheduledTime, req.workspace.timeZone || "Asia/Kolkata")) return res.status(400).json({ message: "Provide a valid future date, time, and type in your workspace timezone" });
        current.type = type;
        current.scheduledDate = scheduledDate;
        current.scheduledTime = scheduledTime;
        current.note = note;
        await current.save();
        const result = await followUp.findById(current._id).populate("leadId", "name company email phone");
        return res.status(200).json({ data: result });
    } catch (error) {
        return res.status(500).json({ message: "Unable to update follow-up" });
    }
};

export const completeFollowUp = async (req, res) => {
    try {
        const updated = await followUp.findOneAndUpdate(
            { _id: req.params.id, createdBy: { $in: req.workspaceMemberIds }, status: "Pending" },
            { status: "Completed", completedAt: new Date() },
            { new: true },
        ).populate("leadId", "name company email phone");
        if (!updated) return res.status(404).json({ message: "Pending follow-up not found" });
        return res.status(200).json({ data: updated });
    } catch (error) {
        return res.status(500).json({ message: "Unable to complete follow-up" });
    }
};

export const cancelFollowUp = async (req, res) => {
    try {
        const updated = await followUp.findOneAndUpdate(
            { _id: req.params.id, createdBy: { $in: req.workspaceMemberIds }, status: "Pending" },
            { status: "Cancelled" },
            { new: true },
        ).populate("leadId", "name company email phone");
        if (!updated) return res.status(404).json({ message: "Pending follow-up not found" });
        return res.status(200).json({ data: updated });
    } catch (error) {
        return res.status(500).json({ message: "Unable to cancel follow-up" });
    }
};
