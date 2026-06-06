import { lead } from "../models/Lead.js";
//---------------------------------------------------------
async function getLeadStatusController(req, res) {
    try {
        const count = await lead.countDocuments();
        const newLead = await lead.countDocuments({ status: 'New' });
        const contactedLead = await lead.countDocuments({ status: 'Contacted' });
        const qualifiedLead = await lead.countDocuments({ status: 'Qualified' });
        const lostLead = await lead.countDocuments({ status: 'Lost' });

        return res.status(200).json({
        totalLeads: count,
        newLeads: newLead,
        contactedLeads: contactedLead,
        qualifiedLeads: qualifiedLead,
        lostLeads: lostLead
    });

    } catch (error) {
        console.log(error);
        
        res.status(500).json({ message: 'Error fetching lead status', error: error.message });
    }
        
};

export const getLeadStatusApi = getLeadStatusController;