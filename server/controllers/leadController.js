import { lead } from "../models/Lead.js";
//---------------------------------------------------------
async function leadController(req, res) {
    try {
        const { name, company, email, phone, status, notes } = req.body;
        if (!name && !company && !email && !phone) {
            return res.status(400).json({ message: 'All fields are required' })
        };
        const leads = new lead({
            name,
            company,
            email,
            phone,
            status,
            notes

        });
        await leads.save();
    } catch (error) {
        res.status(500).json({ message: 'Server error' })
    }
    return res.status(201).json({ message: 'Lead created successfully' })
}
export const leadApi = leadController;