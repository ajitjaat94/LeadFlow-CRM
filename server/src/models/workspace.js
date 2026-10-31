import mongoose from "mongoose";

const workspaceMemberSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    role: {
        type: String,
        enum: ["owner", "admin", "member"],
        default: "member",
        required: true,
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        unique: true,
        index: true,
    },
    members: {
        type: [workspaceMemberSchema],
        default: [],
    },
}, { timestamps: true });

workspaceSchema.index({ "members.user": 1 });

export const workspace = mongoose.model("workspace", workspaceSchema);
