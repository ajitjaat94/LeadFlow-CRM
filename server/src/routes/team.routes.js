import express from "express";
import {
    acceptTeamInvitation,
    createTeamInvitation,
    getWorkspaceTeam,
    previewTeamInvitation,
    removeTeamMember,
    revokeTeamInvitation,
    updateTeamMemberRole,
} from "../controllers/team.controller.js";
import { verifyMeddleware } from "../middlewares/verify-User.middlewares.js";
import { workspaceContext } from "../middlewares/workspace.middleware.js";

const router = express.Router();

router.get("/invitations/preview/:token", previewTeamInvitation);
router.use(verifyMeddleware, workspaceContext);
router.get("/", getWorkspaceTeam);
router.post("/invitations", createTeamInvitation);
router.post("/invitations/accept", acceptTeamInvitation);
router.delete("/invitations/:id", revokeTeamInvitation);
router.patch("/members/:id", updateTeamMemberRole);
router.delete("/members/:id", removeTeamMember);

export const teamRoutes = router;
