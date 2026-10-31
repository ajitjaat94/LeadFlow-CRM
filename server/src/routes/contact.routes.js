import express from "express";
import { verifyMeddleware } from "../middlewares/verify-User.middlewares.js";
import { workspaceContext } from "../middlewares/workspace.middleware.js";
import {
    createContact,
    deleteContact,
    getContact,
    getContactOwners,
    getContacts,
    linkContactLead,
    mergeContact,
    mergeDuplicateIntoContact,
    setContactArchived,
    unlinkContactLead,
    updateContact,
} from "../controllers/contact.controller.js";

const router = express.Router();

router.use(verifyMeddleware, workspaceContext);
router.get("/owners", getContactOwners);
router.get("/", getContacts);
router.post("/", createContact);
router.get("/:id", getContact);
router.put("/:id", updateContact);
router.post("/:id/leads", linkContactLead);
router.delete("/:id/leads/:leadId", unlinkContactLead);
router.post("/:id/merge", mergeContact);
router.post("/:id/merge-duplicate", mergeDuplicateIntoContact);
router.patch("/:id/archive", setContactArchived);
router.delete("/:id", deleteContact);

export const contactRoutes = router;
