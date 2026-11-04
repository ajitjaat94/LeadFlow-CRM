import express from "express";
import {
    getSettings,
    updateProfileSettings,
    updateWorkspaceSettings,
} from "../controllers/settings.controller.js";
import { verifyMeddleware } from "../middlewares/verify-User.middlewares.js";
import { workspaceContext } from "../middlewares/workspace.middleware.js";

const router = express.Router();

router.use(verifyMeddleware, workspaceContext);
router.get("/", getSettings);
router.put("/profile", updateProfileSettings);
router.put("/workspace", updateWorkspaceSettings);

export const settingsRoutes = router;
