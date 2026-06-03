import { leadApi } from "../controllers/leadController.js";
import express from "express";
const router = express.Router();

router.post('/', leadApi);

export const leadRoutes = router;
