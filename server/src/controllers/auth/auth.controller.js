import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { user } from "../../models/user.models.js";
import { asyncHelper } from "../../utils/utils.asyncHandler.js";
import { sendResponce } from "../../utils/utils.responce.js";

const escapedEmail = (email) => String(email || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createTokenPair = async (account, expectedRefreshToken = null) => {
    const accessToken = jwt.sign(
        { id: account._id, email: account.email, role: account.role },
        process.env.ACCESS_TOKEN_SECRET || "access-secret",
        { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
        { id: account._id },
        process.env.REFRESH_TOKEN_SECRET || "refresh-secret",
        { expiresIn: "7d" }
    );
    if (expectedRefreshToken) {
        const rotation = await user.findOneAndUpdate(
            { _id: account._id, refreshToken: expectedRefreshToken },
            { refreshToken },
            { new: true }
        );
        if (!rotation) return null;
    } else {
        await user.findByIdAndUpdate(account._id, { refreshToken });
    }
    return { accessToken, refreshToken };
};

const getPublicUser = (account) => ({
    id: account._id,
    username: account.username,
    email: account.email,
    role: account.role,
});

// Signup Controller
export const signup = asyncHelper(async (req, res) => {
    const { username, password } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();

    // Check if user already exists
    const existingUser = await user.findOne({ email: { $regex: `^${escapedEmail(email)}$`, $options: "i" } });
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

    const { accessToken, refreshToken } = await createTokenPair(newUser);

    return sendResponce(res, 201, true, "User registered successfully", {
        user: getPublicUser(newUser),
        accessToken,
        refreshToken,
    });
});

// Login Controller
export const login = asyncHelper(async (req, res) => {
    const { password } = req.body;
    const email = String(req.body.email || "").trim();

    // Find user by email
    const foundUser = await user.findOne({
        email: { $regex: `^${escapedEmail(email)}$`, $options: "i" },
    }).select("+password");
    if (!foundUser) {
        return sendResponce(res, 401, false, "Invalid credentials", null, "User not found");
    }

    // Compare passwords
    const isPasswordCorrect = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordCorrect) {
        return sendResponce(res, 401, false, "Invalid credentials", null, "Incorrect password");
    }

    const { accessToken, refreshToken } = await createTokenPair(foundUser);

    return sendResponce(res, 200, true, "Login successful", {
        user: getPublicUser(foundUser),
        accessToken,
        refreshToken,
    });
});

export const refresh = asyncHelper(async (req, res) => {
    const refreshToken = String(req.body?.refreshToken || "").trim();
    if (!refreshToken) {
        return sendResponce(res, 401, false, "Refresh token is required");
    }

    let decoded;
    try {
        decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET || "refresh-secret"
        );
    } catch {
        return sendResponce(res, 401, false, "Refresh session expired. Please sign in again.");
    }

    if (!decoded.id) {
        return sendResponce(res, 401, false, "Invalid refresh session. Please sign in again.");
    }

    const foundUser = await user.findOne({ _id: decoded.id, refreshToken });
    if (!foundUser) {
        return sendResponce(res, 401, false, "Refresh session is no longer valid. Please sign in again.");
    }

    const tokens = await createTokenPair(foundUser, refreshToken);
    if (!tokens) {
        return sendResponce(res, 401, false, "Refresh session is no longer valid. Please sign in again.");
    }
    return sendResponce(res, 200, true, "Session renewed", {
        user: getPublicUser(foundUser),
        ...tokens,
    });
});

export const logout = asyncHelper(async (req, res) => {
    const refreshToken = String(req.body?.refreshToken || "").trim();
    if (refreshToken) {
        await user.updateOne({ refreshToken }, { $unset: { refreshToken: 1 } });
    }
    return sendResponce(res, 200, true, "Signed out");
});
