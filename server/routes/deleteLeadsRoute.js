import { deleteLeadsApi } from "../controllers/deleteLeadsController.js";
import express from 'express';
//---------------------------------------------------------
const router = express.Router();
router.delete('/:id', deleteLeadsApi);


export const deleteLeadsRoutes = router;