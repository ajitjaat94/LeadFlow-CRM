import mongoose from "mongoose";

const dealStages = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Won", "Lost"];

const dealSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160,
    },
    value: {
        type: Number,
        min: 0,
        default: 0,
    },
    currency: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 3,
        default: "INR",
    },
    stage: {
        type: String,
        enum: dealStages,
        default: "Prospecting",
        index: true,
    },
    probability: {
        type: Number,
        min: 0,
        max: 100,
        default: 10,
    },
    expectedCloseDate: {
        type: Date,
        default: null,
    },
    contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "contact",
        default: null,
    },
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "lead",
        default: null,
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 10000,
        default: "",
    },
}, { timestamps: true });

dealSchema.index({ owner: 1, stage: 1, updatedAt: -1 });

export const deal = mongoose.model("deal", dealSchema);
export { dealStages };
