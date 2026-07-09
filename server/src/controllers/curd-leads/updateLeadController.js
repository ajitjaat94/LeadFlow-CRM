import { lead } from "../../models/lead.js";
//---------------------------------------------------------
async function updateLeadController(req, res) {
    try {
        const { id } = req.params;
        const { name, company, email, phone, status, notes } = req.body;
        const leads = await lead.findOne({ _id: id, user: req.user?.userId });
        if (!leads) {
            return res.status(404).json({ message: 'Lead not found' })
        };
        const updatedLead = {
            name: name || leads.name,
            company: company || leads.company,
            email: email || leads.email,
            phone: phone || leads.phone,
            status: status || leads.status,
            notes: notes || leads.notes
        };
        const updated = await lead.findOneAndUpdate({ _id: id, user: req.user?.userId }, updatedLead, { new: true });
        return res.status(200).json({ message: 'Lead updated successfully', leads: updated });
    } catch (error) {
        res.status(500).json({ message: 'Error updating lead' });
    };

}

export const updateLeadApi = updateLeadController;