import { leadField } from "../models/leadField.js";

const fieldTypes = ["text", "number", "email", "phone", "date", "dropdown", "checkbox", "url"];

const normalizeKey = (value) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const getLeadFields = async (req, res) => {
    try {
        const fields = await leadField.find({ user: { $in: req.workspaceMemberIds }, enabled: true }).sort({ order: 1, createdAt: 1 });
        return res.status(200).json({ data: fields });
    } catch (error) {
        return res.status(500).json({ message: "Unable to load lead fields" });
    }
};

export const createLeadField = async (req, res) => {
    try {
        const { name, key, type, options = [], required = false, order } = req.body;
        const cleanName = name?.trim();
        const cleanKey = normalizeKey(key || cleanName || "");
        const cleanOptions = Array.isArray(options) ? options.map((option) => String(option).trim()).filter(Boolean) : [];

        if (!cleanName || !cleanKey) return res.status(400).json({ message: "Field name is required" });
        if (!fieldTypes.includes(type)) return res.status(400).json({ message: "Invalid field type" });
        if (type === "dropdown" && cleanOptions.length === 0) return res.status(400).json({ message: "Dropdown requires at least one option" });

        const existingField = await leadField.findOne({ user: { $in: req.workspaceMemberIds }, key: cleanKey });
        if (existingField) return res.status(409).json({ message: "A field with this name already exists" });

        const field = await leadField.create({
            user: req.user.userId,
            name: cleanName,
            key: cleanKey,
            type,
            options: cleanOptions,
            required: Boolean(required),
            order: Number.isFinite(Number(order)) ? Number(order) : 0,
        });
        return res.status(201).json({ data: field });
    } catch (error) {
        return res.status(500).json({ message: "Unable to create lead field" });
    }
};

export const updateLeadField = async (req, res) => {
    const { id } = req.params;
    const updates = {};
    if (req.body.name) updates.name = req.body.name.trim();
    if (req.body.type) updates.type = req.body.type;
    if (req.body.options) updates.options = req.body.options;
    if (typeof req.body.required === "boolean") updates.required = req.body.required;
    if (typeof req.body.order === "number") updates.order = req.body.order;
    if (typeof req.body.enabled === "boolean") updates.enabled = req.body.enabled;

    if (updates.type && !fieldTypes.includes(updates.type)) return res.status(400).json({ message: "Invalid field type" });
    if (updates.type === "dropdown" && (!updates.options || updates.options.length === 0)) return res.status(400).json({ message: "Dropdown requires at least one option" });

    try {
        const field = await leadField.findOneAndUpdate({ _id: id, user: { $in: req.workspaceMemberIds } }, updates, { new: true, runValidators: true });
        if (!field) return res.status(404).json({ message: "Lead field not found" });
        return res.status(200).json({ data: field });
    } catch (error) {
        return res.status(500).json({ message: "Unable to update lead field" });
    }
};

export const deleteLeadField = async (req, res) => {
    try {
        const field = await leadField.findOneAndDelete({ _id: req.params.id, user: { $in: req.workspaceMemberIds } });
        if (!field) return res.status(404).json({ message: "Lead field not found" });
        return res.status(200).json({ message: "Lead field deleted" });
    } catch (error) {
        return res.status(500).json({ message: "Unable to delete lead field" });
    }
};
