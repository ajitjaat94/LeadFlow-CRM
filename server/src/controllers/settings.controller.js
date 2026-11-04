import { user } from "../models/user.models.js";

const canManageWorkspace = (req) => ["owner", "admin"].includes(req.workspaceRole);

export const getSettings = async (req, res) => {
    try {
        const account = await user.findById(req.user.userId).select("username email role").lean();
        if (!account) return res.status(404).json({ message: "Account not found." });

        return res.status(200).json({
            data: {
                profile: {
                    id: account._id,
                    username: account.username,
                    email: account.email,
                    role: account.role,
                },
                workspace: {
                    id: req.workspace._id,
                    name: req.workspace.name,
                    timeZone: req.workspace.timeZone || "Asia/Kolkata",
                    role: req.workspaceRole,
                },
            },
        });
    } catch (error) {
        console.error("Unable to load settings", error);
        return res.status(500).json({ message: "Unable to load settings." });
    }
};

export const updateProfileSettings = async (req, res) => {
    const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
    if (!username || username.length > 80) {
        return res.status(400).json({ message: "Name must be between 1 and 80 characters." });
    }

    try {
        const account = await user.findByIdAndUpdate(
            req.user.userId,
            { $set: { username } },
            { new: true, runValidators: true },
        ).select("username email role");
        if (!account) return res.status(404).json({ message: "Account not found." });

        return res.status(200).json({
            data: {
                id: account._id,
                username: account.username,
                email: account.email,
                role: account.role,
            },
        });
    } catch (error) {
        console.error("Unable to update profile settings", error);
        return res.status(500).json({ message: "Unable to update your profile." });
    }
};

export const updateWorkspaceSettings = async (req, res) => {
    if (!canManageWorkspace(req)) {
        return res.status(403).json({ message: "Only workspace owners and admins can update workspace settings." });
    }

    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const timeZone = typeof req.body.timeZone === "string" ? req.body.timeZone.trim() : "";
    if (!name || name.length > 120) {
        return res.status(400).json({ message: "Workspace name must be between 1 and 120 characters." });
    }
    if (!timeZone || timeZone.length > 100) {
        return res.status(400).json({ message: "Choose a valid timezone." });
    }
    try {
        new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    } catch {
        return res.status(400).json({ message: "Choose a valid IANA timezone." });
    }

    try {
        req.workspace.name = name;
        req.workspace.timeZone = timeZone;
        await req.workspace.save();
        return res.status(200).json({
            data: {
                id: req.workspace._id,
                name: req.workspace.name,
                timeZone: req.workspace.timeZone,
                role: req.workspaceRole,
            },
        });
    } catch (error) {
        console.error("Unable to update workspace settings", error);
        return res.status(500).json({ message: "Unable to update workspace settings." });
    }
};
