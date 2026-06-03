import { getLeadStatusApi } from "../controllers/leadStatusController.js";
import express from 'express';
//---------------------------------------------------------
const router = express.Router();
router.get('/daskbord-status', getLeadStatusApi);

export const getStatusLeadRoutes = router;