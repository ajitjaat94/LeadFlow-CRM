import { lead } from "../../models/lead.js";
//---------------------------------------------------------
async function leadController(req, res) {
    try {
        const { name, company, email, phone, source, status, notes, customFields } = req.body;
        if (!name || !company || !email) {
            return res.status(400).json({ message: 'All fields are required' })
        };

        const leads = new lead({
            user: req.user?.userId,
            name,
            company,
            email,
            phone,
            source,
            status,
            notes,
            customFields: customFields || {}
        });

        await leads.save();
        return res.status(201).json({ message: 'Lead created successfully', data: leads })
    } catch (error) {
        res.status(500).json({ message: 'Server error' })
    }
}
export const leadApi = leadController;