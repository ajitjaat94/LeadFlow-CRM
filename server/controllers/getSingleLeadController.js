import { lead } from "../models/lead.js";
//---------------------------------------------------------
async function getSingleLeadController(req, res) {
    try {
        const { id } = req.params; 
        const leads = await lead.findById(id);

        if (!leads) {
            return res.status(404).json({ message: 'Lead not found' });
        }

         return res.status(200).json({ message: 'Lead found successfully', data: leads });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
   
};

export const getSingleLeadApi = getSingleLeadController;