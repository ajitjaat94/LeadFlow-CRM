import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { teamInvitation } from "../models/teamInvitation.js";
import { user } from "../models/user.models.js";
import { workspace } from "../models/workspace.js";
import { ensureUserWorkspace } from "../middlewares/workspace.middleware.js";

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const normalizeEmail = (email) => typeof email === "string" ? email.trim().toLowerCase() : "";
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const canManageWorkspace = (req) => ["owner", "admin"].includes(req.workspaceRole);

const invitationIsActive = (invitation) => (
    invitation && !invitation.acceptedAt && !invitation.revokedAt && invitation.expiresAt > new Date()
);

export const getWorkspaceTeam = async (req, res) => {
    try {
        const [currentWorkspace, invitations] = await Promise.all([
            workspace.findById(req.workspace._id)
                .populate("members.user", "username email")
                .populate("owner", "username email")
                .lean(),
            teamInvitation.find({
                workspace: req.workspace._id,
                acceptedAt: null,
                revokedAt: null,
                expiresAt: { $gt: new Date() },
            })
                .populate("invitedBy", "username email")
                .sort({ createdAt: -1 })
                .lean(),
        ]);
        if (!currentWorkspace) return res.status(404).json({ message: "Workspace not found." });
        const members = currentWorkspace.members.map((member) => ({
            id: member.user?._id,
            username: member.user?.username || "Unknown member",
            email: member.user?.email || "",
            role: member.role,
            joinedAt: member.joinedAt,
            isCurrentUser: String(member.user?._id) === String(req.user.userId),
        }));
        return res.status(200).json({
            data: {
                id: currentWorkspace._id,
                name: currentWorkspace.name,
                owner: currentWorkspace.owner
                    ? { id: currentWorkspace.owner._id, username: currentWorkspace.owner.username }
                    : null,
                currentUserRole: req.workspaceRole,
                members,
                invitations: invitations.map((invitation) => ({
                    id: invitation._id,
                    email: invitation.email,
                    role: invitation.role,
                    expiresAt: invitation.expiresAt,
                    invitedBy: invitation.invitedBy?.username || "Workspace admin",
                    createdAt: invitation.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error("Unable to load workspace team", error);
        return res.status(500).json({ message: "Unable to load your team." });
    }
};

export const previewTeamInvitation = async (req, res) => {
    try {
        const token = req.params.token;
        if (typeof token !== "string" || !/^[a-f\d]{64}$/i.test(token)) {
            return res.status(404).json({ message: "This invitation is invalid or has expired." });
        }
        const invitation = await teamInvitation.findOne({ tokenHash: hashToken(token) })
            .populate("workspace", "name")
            .lean();
        if (!invitationIsActive(invitation) || !invitation.workspace) {
            return res.status(404).json({ message: "This invitation is invalid or has expired." });
        }
        return res.status(200).json({
            data: {
                workspaceName: invitation.workspace.name,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt,
            },
        });
    } catch (error) {
        console.error("Unable to preview team invitation", error);
        return res.status(500).json({ message: "Unable to load this invitation." });
    }
};

export const createTeamInvitation = async (req, res) => {
    try {
        if (!canManageWorkspace(req)) return res.status(403).json({ message: "Only workspace admins can invite teammates." });
        const email = normalizeEmail(req.body.email);
        const role = req.body.role === "admin" ? "admin" : req.body.role === "member" ? "member" : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            return res.status(400).json({ message: "Enter a valid email address." });
        }
        if (!role) return res.status(400).json({ message: "Choose a valid team role." });
        const existingUser = await user.findOne({ email }).select("_id workspaceId").lean();
        if (existingUser && req.workspaceMemberIds.some((id) => String(id) === String(existingUser._id))) {
            return res.status(409).json({ message: "This person is already a workspace member." });
        }

        const token = randomBytes(32).toString("hex");
        const values = {
            workspace: req.workspace._id,
            email,
            role,
            tokenHash: hashToken(token),
            invitedBy: req.user.userId,
            expiresAt: new Date(Date.now() + invitationLifetimeMs),
            acceptedAt: null,
            acceptedBy: null,
            revokedAt: null,
        };
        const existingInvitation = await teamInvitation.findOne({
            workspace: req.workspace._id,
            email,
            acceptedAt: null,
            revokedAt: null,
        });
        const invitation = existingInvitation
            ? await teamInvitation.findByIdAndUpdate(existingInvitation._id, values, { new: true })
            : await teamInvitation.create(values);
        return res.status(201).json({
            data: {
                id: invitation._id,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt,
                token,
            },
        });
    } catch (error) {
        console.error("Unable to create team invitation", error);
        return res.status(500).json({ message: "Unable to create an invitation." });
    }
};

export const acceptTeamInvitation = async (req, res) => {
    try {
        const { token } = req.body;
        if (typeof token !== "string" || !/^[a-f\d]{64}$/i.test(token)) {
            return res.status(400).json({ message: "This invitation is invalid or has expired." });
        }
        const invitation = await teamInvitation.findOne({ tokenHash: hashToken(token) });
        if (!invitationIsActive(invitation)) {
            return res.status(404).json({ message: "This invitation is invalid or has expired." });
        }
        const account = await user.findById(req.user.userId).select("email workspaceId").lean();
        if (!account || normalizeEmail(account.email) !== invitation.email) {
            return res.status(403).json({ message: "Sign in with the email address this invitation was sent to." });
        }
        const targetWorkspace = await workspace.findById(invitation.workspace);
        if (!targetWorkspace) return res.status(404).json({ message: "The invited workspace no longer exists." });

        if (targetWorkspace.members.some((member) => String(member.user) === String(req.user.userId))) {
            return res.status(409).json({ message: "You are already a member of this workspace." });
        }
        const currentWorkspace = await ensureUserWorkspace(req.user.userId);
        if (
            String(currentWorkspace._id) !== String(targetWorkspace._id)
            && String(currentWorkspace.owner) === String(req.user.userId)
            && currentWorkspace.members.some((member) => String(member.user) !== String(req.user.userId))
        ) {
            return res.status(409).json({
                message: "Transfer workspace ownership or remove your teammates before joining another workspace.",
            });
        }

        targetWorkspace.members.push({
            user: req.user.userId,
            role: invitation.role,
            joinedAt: new Date(),
        });
        await targetWorkspace.save();
        await user.updateOne({ _id: req.user.userId }, { $set: { workspaceId: targetWorkspace._id } });
        if (String(currentWorkspace._id) !== String(targetWorkspace._id)) {
            currentWorkspace.members = currentWorkspace.members.filter(
                (member) => String(member.user) !== String(req.user.userId),
            );
            if (
                String(currentWorkspace.owner) === String(req.user.userId)
                && currentWorkspace.members.length === 0
            ) {
                await workspace.deleteOne({ _id: currentWorkspace._id });
            } else {
                await currentWorkspace.save();
            }
        }
        invitation.acceptedAt = new Date();
        invitation.acceptedBy = req.user.userId;
        await invitation.save();
        return res.status(200).json({
            data: {
                workspaceId: targetWorkspace._id,
                workspaceName: targetWorkspace.name,
                role: invitation.role,
            },
        });
    } catch (error) {
        console.error("Unable to accept team invitation", error);
        return res.status(500).json({ message: "Unable to accept this invitation." });
    }
};

export const revokeTeamInvitation = async (req, res) => {
    try {
        if (!canManageWorkspace(req)) return res.status(403).json({ message: "Only workspace admins can revoke invitations." });
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid invitation ID." });
        const invitation = await teamInvitation.findOneAndUpdate(
            {
                _id: req.params.id,
                workspace: req.workspace._id,
                acceptedAt: null,
                revokedAt: null,
            },
            { revokedAt: new Date() },
            { new: true },
        );
        if (!invitation) return res.status(404).json({ message: "Invitation not found." });
        return res.status(200).json({ message: "Invitation revoked." });
    } catch (error) {
        console.error("Unable to revoke team invitation", error);
        return res.status(500).json({ message: "Unable to revoke this invitation." });
    }
};

export const updateTeamMemberRole = async (req, res) => {
    try {
        if (!canManageWorkspace(req)) return res.status(403).json({ message: "Only workspace admins can change team roles." });
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid member ID." });
        const role = req.body.role === "admin" || req.body.role === "member" ? req.body.role : "";
        if (!role) return res.status(400).json({ message: "Choose a valid team role." });
        if (String(req.params.id) === String(req.workspace.owner)) {
            return res.status(400).json({ message: "The workspace owner's role cannot be changed." });
        }
        const member = req.workspace.members.find((item) => String(item.user) === req.params.id);
        if (!member) return res.status(404).json({ message: "Team member not found." });
        member.role = role;
        await req.workspace.save();
        return res.status(200).json({ message: "Team role updated." });
    } catch (error) {
        console.error("Unable to update team member role", error);
        return res.status(500).json({ message: "Unable to update this team member." });
    }
};

export const removeTeamMember = async (req, res) => {
    try {
        if (!canManageWorkspace(req)) return res.status(403).json({ message: "Only workspace admins can remove team members." });
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid member ID." });
        if (String(req.params.id) === String(req.workspace.owner)) {
            return res.status(400).json({ message: "The workspace owner cannot be removed." });
        }
        const memberExists = req.workspace.members.some((member) => String(member.user) === req.params.id);
        if (!memberExists) return res.status(404).json({ message: "Team member not found." });
        req.workspace.members = req.workspace.members.filter((member) => String(member.user) !== req.params.id);
        await req.workspace.save();
        await user.updateOne(
            { _id: req.params.id, workspaceId: req.workspace._id },
            { $set: { workspaceId: null } },
        );
        return res.status(200).json({ message: "Team member removed. Their existing records are no longer shared." });
    } catch (error) {
        console.error("Unable to remove team member", error);
        return res.status(500).json({ message: "Unable to remove this team member." });
    }
};
