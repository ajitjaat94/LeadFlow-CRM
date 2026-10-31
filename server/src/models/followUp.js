import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "lead",
        required: true,
        index: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true,
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null,
    },
    type: {
        type: String,
        enum: ["Call", "WhatsApp", "Email", "Meeting", "Other"],
        required: true,
    },
    scheduledDate: {
        type: String,
        required: true,
    },
    scheduledTime: {
        type: String,
        required: true,
    },
    note: {
        type: String,
        trim: true,
        default: "",
    },
    status: {
        type: String,
        enum: ["Pending", "Completed", "Cancelled"],
        default: "Pending",
        index: true,
    },
    completedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

followUpSchema.index({ createdBy: 1, scheduledDate: 1, scheduledTime: 1 });

export const followUp = mongoose.model("followUp", followUpSchema);
