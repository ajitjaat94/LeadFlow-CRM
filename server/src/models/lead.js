import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    company: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
    },
    status: {
        type: String,
        enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'],
        default: 'New'
    },
    notes: String,
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    }
},
    {
        timestamps: true

    });

export const lead = mongoose.model('lead', leadSchema);