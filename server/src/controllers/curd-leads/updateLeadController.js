import { lead } from "../../models/lead.js";
//---------------------------------------------------------
async function updateLeadController(req, res) {
    try {
        const { id } = req.params;
        const { name, company, email, phone, source, status, notes, customFields } = req.body;
        const leads = await lead.findOne({ _id: id, user: { $in: req.workspaceMemberIds } });
        if (!leads) {
            return res.status(404).json({ message: 'Lead not found' })
        };
        let nextCustomFields = customFields ?? leads.customFields;
        if (Object.prototype.hasOwnProperty.call(req.body, 'source') && !String(source ?? '').trim()) {
            const values = Object.fromEntries(nextCustomFields instanceof Map ? nextCustomFields : Object.entries(nextCustomFields || {}));
            Object.keys(values).forEach((key) => {
                if (['source', 'lead_source'].includes(key.trim().toLowerCase().replace(/[\s-]+/g, '_'))) delete values[key];
            });
            nextCustomFields = values;
        }
        const updatedLead = {
            name: name ?? leads.name,
            company: company ?? leads.company,
            email: email ?? leads.email,
            phone: phone ?? leads.phone,
            source: source ?? leads.source,
            status: status ?? leads.status,
            notes: notes ?? leads.notes,
            customFields: nextCustomFields
        };
        const updated = await lead.findOneAndUpdate({ _id: id, user: { $in: req.workspaceMemberIds } }, updatedLead, { new: true });
        return res.status(200).json({ message: 'Lead updated successfully', leads: updated });
    } catch (error) {
        res.status(500).json({ message: 'Error updating lead' });
    };

}

export const updateLeadApi = updateLeadController;