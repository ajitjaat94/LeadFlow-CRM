import { lead } from "../../models/lead.js";
//---------------------------------------------------------
async function getLeadStatusController(req, res) {
    try {
        const userFilter = { user: req.user?.userId };
        const count = await lead.countDocuments(userFilter);
        const newLead = await lead.countDocuments({ ...userFilter, status: 'New' });
        const contactedLead = await lead.countDocuments({ ...userFilter, status: 'Contacted' });
        const qualifiedLead = await lead.countDocuments({ ...userFilter, status: 'Qualified' });
        const lostLead = await lead.countDocuments({ ...userFilter, status: 'Lost' });

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