import { lead } from "../../models/lead.js";
//---------------------------------------------------------
async function deleteLeadsController(req, res) {
    try {
        const { id } = req.params;
        const leads = await lead.findOneAndDelete({ _id: id, user: req.user?.userId });
        if (!leads) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        return res.status(200).json({ message: 'Lead deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteLeadsApi = deleteLeadsController;