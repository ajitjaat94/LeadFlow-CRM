import JWT from "jsonwebtoken";
import { asyncHelper } from "../utils/utils.asyncHandler.js";
async function verifyUser(req, res, next) {
    try {

        const authHeader = req.headers.authorization;//client request send token auto
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'please login again'
            })
        };

        const accessToken = authHeader.split(" ")[1]; //Token extract 

        const decode = JWT.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET || process.env.ASSCESS_SECRET || "access-secret"
        );
        req.user = {
            userId: decode.id || decode.userId || decode._id,
            role: decode.role
        }
        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "jwt expired"
            });
        }
        return res.status(401).json({
            success: false,
            message: "invalid token"
        })
    }
};

export const verifyMeddleware = asyncHelper(verifyUser)