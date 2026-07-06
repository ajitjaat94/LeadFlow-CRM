import express from "express";
import { leadApi } from "../../controllers/curd-leads/leadController.js";
import { getLeadsApi } from "../../controllers/curd-leads/getLeadsController.js";
import { getSingleLeadApi } from "../../controllers/curd-leads/getSingleLeadController.js";
import { updateLeadApi } from "../../controllers/curd-leads/updateLeadController.js";
import { deleteLeadsApi } from "../../controllers/curd-leads/deleteLeadsController.js";
import { getLeadStatusApi } from "../../controllers/curd-leads/leadStatusController.js";

const router = express.Router();

router.post('/', leadApi);
router.get('/status', getLeadStatusApi);
router.get('/', getLeadsApi);
router.get('/:id', getSingleLeadApi);
router.put('/:id', updateLeadApi);
router.delete('/:id', deleteLeadsApi);

export const leadRoutes = router;
