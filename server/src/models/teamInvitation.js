import mongoose from "mongoose";

const teamInvitationSchema = new mongoose.Schema({
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "workspace",
        required: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
    },
    role: {
        type: String,
        enum: ["admin", "member"],
        default: "member",
        required: true,
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        select: false,
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
    acceptedAt: {
        type: Date,
        default: null,
    },
    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null,
    },
    revokedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

teamInvitationSchema.index({ workspace: 1, email: 1, acceptedAt: 1, revokedAt: 1 });

export const teamInvitation = mongoose.model("teamInvitation", teamInvitationSchema);
