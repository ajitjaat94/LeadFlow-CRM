import mongoose from "mongoose";

const leadFieldSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    key: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ["text", "number", "email", "phone", "date", "dropdown", "checkbox", "url"],
        required: true,
    },
    options: {
        type: [String],
        default: [],
    },
    required: {
        type: Boolean,
        default: false,
    },
    order: {
        type: Number,
        default: 0,
    },
    enabled: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

leadFieldSchema.index({ user: 1, key: 1 }, { unique: true });

export const leadField = mongoose.model("leadField", leadFieldSchema);
