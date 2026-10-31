import { lead } from "../../models/lead.js";
//---------------------------------------------------------
async function getLeadsController(req, res) {
    try {
        const leads = await lead.find({ user: { $in: req.workspaceMemberIds } });
        return res.status(200).json({
            message: 'Leads retrieved successfully',
            data: leads
        })

    } catch (error) {
        res.status(500).json({ message: 'Server error' })
    }

}
export const getLeadsApi = getLeadsController;