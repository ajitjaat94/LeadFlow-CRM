import { getSingleLeadApi } from "../controllers/getSingleLeadController.js";
import express from 'express';
//---------------------------------------------------------
const router = express.Router();
router.get('/:id', getSingleLeadApi);

export const getSingleLeadRoutes = router;