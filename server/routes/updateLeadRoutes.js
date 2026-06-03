import { updateLeadApi } from "../controllers/updateLeadController.js";
import express from "express";
//---------------------------------------------------------
const router = express.Router();
router.put('/:id', updateLeadApi);

export const updateLeadRoutes = router;