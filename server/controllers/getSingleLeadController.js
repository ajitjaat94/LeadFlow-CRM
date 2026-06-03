import { Lead } from "../models/Lead.js";
//---------------------------------------------------------
async function getSingleLeadController(req, res) {
    try {
        const { id } = req.params; 
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

         return res.status(200).json({ message: 'Lead found successfully', data: lead });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
   
};

export const getSingleLeadApi = getSingleLeadController;