import express from "express";
import { verifyMeddleware } from "../middlewares/verify-User.middlewares.js";
import { workspaceContext } from "../middlewares/workspace.middleware.js";
import {
    createDeal,
    deleteDeal,
    getDeals,
    updateDeal,
} from "../controllers/deal.controller.js";

const router = express.Router();

router.use(verifyMeddleware, workspaceContext);
router.get("/", getDeals);
router.post("/", createDeal);
router.put("/:id", updateDeal);
router.delete("/:id", deleteDeal);

export const dealRoutes = router;
