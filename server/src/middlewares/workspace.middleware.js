import { workspace } from "../models/workspace.js";
import { user } from "../models/user.models.js";

export const ensureUserWorkspace = async (userId) => {
    const account = await user.findById(userId).select("username workspaceId").lean();
    if (!account) throw new Error("Authenticated user was not found.");

    let currentWorkspace = account.workspaceId
        ? await workspace.findById(account.workspaceId)
        : await workspace.findOne({ owner: userId });

    if (!currentWorkspace) {
        try {
            currentWorkspace = await workspace.create({
                name: `${String(account.username || "My").slice(0, 100)}'s workspace`,
                owner: userId,
                members: [{ user: userId, role: "owner" }],
            });
        } catch (error) {
            if (error.code !== 11000) throw error;
            currentWorkspace = await workspace.findOne({ owner: userId });
            if (!currentWorkspace) throw error;
        }
    }

    const membership = currentWorkspace.members.find((member) => String(member.user) === String(userId));
    if (!membership) {
        currentWorkspace.members.push({
            user: userId,
            role: String(currentWorkspace.owner) === String(userId) ? "owner" : "member",
        });
        await currentWorkspace.save();
    }

    if (String(account.workspaceId || "") !== String(currentWorkspace._id)) {
        await user.updateOne({ _id: userId }, { $set: { workspaceId: currentWorkspace._id } });
    }

    return currentWorkspace;
};

export const workspaceContext = async (req, res, next) => {
    try {
        const currentWorkspace = await ensureUserWorkspace(req.user.userId);
        req.workspace = currentWorkspace;
        req.workspaceMemberIds = currentWorkspace.members.map((member) => member.user);
        req.workspaceRole = currentWorkspace.members.find(
            (member) => String(member.user) === String(req.user.userId),
        )?.role || "member";
        next();
    } catch (error) {
        console.error("Unable to load current workspace", error);
        return res.status(500).json({ message: "Unable to load your workspace." });
    }
};
