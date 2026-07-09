import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { user } from "../../models/user.models.js";
import { asyncHelper } from "../../utils/utils.asyncHandler.js";
import { sendResponce } from "../../utils/utils.responce.js";

// Signup Controller
export const signup = asyncHelper(async (req, res) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await user.findOne({ email });
    if (existingUser) {
        return sendResponce(res, 400, false, "User already exists", null, "Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await user.create({
        username,
        email,
        password: hashedPassword,
    });

    // Generate tokens
    const accessToken = jwt.sign(
        { id: newUser._id, email: newUser.email, role: newUser.role },
        process.env.ACCESS_TOKEN_SECRET || "access-secret",
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { id: newUser._id },
        process.env.REFRESH_TOKEN_SECRET || "refresh-secret",
        { expiresIn: "7d" }
    );

    // Save refresh token
    await user.findByIdAndUpdate(newUser._id, { refreshToken });

    return sendResponce(res, 201, true, "User registered successfully", {
        user: {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
        },
        accessToken,
        refreshToken,
    });
});

// Login Controller
export const login = asyncHelper(async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const foundUser = await user.findOne({ email }).select("+password");
    if (!foundUser) {
        return sendResponce(res, 401, false, "Invalid credentials", null, "User not found");
    }

    // Compare passwords
    const isPasswordCorrect = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordCorrect) {
        return sendResponce(res, 401, false, "Invalid credentials", null, "Incorrect password");
    }

    // Generate tokens
    const accessToken = jwt.sign(
        { id: foundUser._id, email: foundUser.email, role: foundUser.role },
        process.env.ACCESS_TOKEN_SECRET || "access-secret",
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { id: foundUser._id },
        process.env.REFRESH_TOKEN_SECRET || "refresh-secret",
        { expiresIn: "7d" }
    );

    // Save refresh token
    await user.findByIdAndUpdate(foundUser._id, { refreshToken });

    return sendResponce(res, 200, true, "Login successful", {
        user: {
            id: foundUser._id,
            username: foundUser.username,
            email: foundUser.email,
            role: foundUser.role,
        },
        accessToken,
        refreshToken,
    });
});
