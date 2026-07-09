import mongoose from "mongoose";

const userSchima = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    refreshToken: {
        type: String
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    verifyToken: {
        type: String
    },
    isVerified: {
        type: Boolean,
        default: false
    },
},
    { timestamps: true }
);

export const user = mongoose.model("user", userSchima);

