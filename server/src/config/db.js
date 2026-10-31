import mongoose from "mongoose";

const db = async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error("Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in your .env file.");
    }

    await mongoose.connect(mongoUri);
    console.log("Database connected successfully");
};
export default db;
