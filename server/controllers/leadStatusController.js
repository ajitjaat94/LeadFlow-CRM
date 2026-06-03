import { Lead } from "../models/Lead.js";
//---------------------------------------------------------
async function getLeadStatusController(req, res) {
    try {
        const count = await Lead.countDocuments();
        const newLead = await Lead.countDocuments({ status: 'New' });
        const contactedLead = await Lead.countDocuments({ status: 'Contacted' });
        const qualifiedLead = await Lead.countDocuments({ status: 'Qualified' });
        const lostLead = await Lead.countDocuments({ status: 'Lost' });

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