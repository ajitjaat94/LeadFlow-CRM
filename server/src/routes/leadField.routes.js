import express from "express";
import { verifyMeddleware } from "../middlewares/verify-User.middlewares.js";
import { workspaceContext } from "../middlewares/workspace.middleware.js";
import { createLeadField, deleteLeadField, getLeadFields, updateLeadField } from "../controllers/leadField.controller.js";

const router = express.Router();

router.use(verifyMeddleware, workspaceContext);
router.get("/", getLeadFields);
router.post("/", createLeadField);
router.put("/:id", updateLeadField);
router.delete("/:id", deleteLeadField);

export const leadFieldRoutes = router;
