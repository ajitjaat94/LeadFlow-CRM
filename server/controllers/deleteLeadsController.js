import { lead } from "../models/Lead.js";
//---------------------------------------------------------
async function deleteLeadsController(req, res) {
    try {
        const { id } = req.params;
        const leads = await lead.findByIdAndDelete(id);
        if (!leads) {
            return res.status(404).json({ message: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
    return res.status(200).json({ message: 'Lead deleted successfully' });
};

export const deleteLeadsApi = deleteLeadsController;