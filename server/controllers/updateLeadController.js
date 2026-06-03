import { Lead } from "../models/Lead.js";
//---------------------------------------------------------
async function updateLeadController(req, res) {
    try {
        const { id } = req.params;
        const { name, company, email, phone, status, notes } = req.body;
        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' })
        };
        const updatedLead = {
            name: name || lead.name,
            company: company || lead.company,
            email: email || lead.email,
            phone: phone || lead.phone,
            status: status || lead.status,
            notes: notes || lead.notes
        };
        await Lead.findByIdAndUpdate(id, updatedLead, { new: true });
          return res.status(200).json({ message: 'Lead updated successfully', lead: updatedLead });
    } catch (error) {
        res.status(500).json({ message: 'Error updating lead' });
    };
  
}

export const updateLeadApi = updateLeadController;