import { getLeadsApi } from "../controllers/getLeadsController.js";
import express from "express";
const router = express.Router();

router.get('/', getLeadsApi);

export const getLeadRoutes = router;