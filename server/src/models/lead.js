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
        enum: ['New', 'Contacted', 'Qualified', 'Lost'],
        default: 'New'
    },
    notes: String
},
    {
        timestamps: true

    });

export const lead = mongoose.model('lead', leadSchema);