import mongoose from "mongoose";

const contactActivitySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const contactSchema = new mongoose.Schema({
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
        maxlength: 120,
    },
    phone: {
        type: String,
        trim: true,
        maxlength: 40,
        default: "",
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 254,
        default: "",
    },
    company: {
        type: String,
        trim: true,
        maxlength: 160,
        default: "",
    },
    designation: {
        type: String,
        trim: true,
        maxlength: 120,
        default: "",
    },
    city: {
        type: String,
        trim: true,
        maxlength: 120,
        default: "",
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 10000,
        default: "",
    },
    tags: {
        type: [String],
        default: [],
    },
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {},
    },
    leadIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "lead",
    }],
    activities: {
        type: [contactActivitySchema],
        default: [],
    },
    archived: {
        type: Boolean,
        default: false,
        index: true,
    },
    mergedInto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "contact",
        default: null,
    },
}, { timestamps: true });

contactSchema.index({ owner: 1, archived: 1, updatedAt: -1 });

export const contact = mongoose.model("contact", contactSchema);
