import express from "express";
import { verifyMeddleware } from "../middlewares/verify-User.middlewares.js";
import { workspaceContext } from "../middlewares/workspace.middleware.js";
import { cancelFollowUp, completeFollowUp, createFollowUp, getFollowUps, getLeadFollowUps, updateFollowUp } from "../controllers/followUp.controller.js";

const router = express.Router();

router.use(verifyMeddleware, workspaceContext);
router.get("/", getFollowUps);
router.get("/lead/:leadId", getLeadFollowUps);
router.post("/", createFollowUp);
router.put("/:id", updateFollowUp);
router.patch("/:id/complete", completeFollowUp);
router.patch("/:id/cancel", cancelFollowUp);

export const followUpRoutes = router;
