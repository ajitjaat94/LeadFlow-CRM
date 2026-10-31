import { lead } from "../../models/lead.js";
//---------------------------------------------------------
async function getLeadStatusController(req, res) {
    try {
        const userFilter = { user: { $in: req.workspaceMemberIds } };
        const count = await lead.countDocuments(userFilter);
        const newLead = await lead.countDocuments({ ...userFilter, status: 'New' });
        const contactedLead = await lead.countDocuments({ ...userFilter, status: 'Contacted' });
        const qualifiedLead = await lead.countDocuments({ ...userFilter, status: 'Qualified' });
        const proposalLead = await lead.countDocuments({ ...userFilter, status: 'Proposal' });
        const negotiationLead = await lead.countDocuments({ ...userFilter, status: 'Negotiation' });
        const wonLead = await lead.countDocuments({ ...userFilter, status: 'Won' });
        const lostLead = await lead.countDocuments({ ...userFilter, status: 'Lost' });
        const openLead = await lead.countDocuments({
            ...userFilter,
            status: { $in: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation'] }
        });

        return res.status(200).json({
        totalLeads: count,
        newLeads: newLead,
        openLeads: openLead,
        contactedLeads: contactedLead,
        qualifiedLeads: qualifiedLead,
        proposalLeads: proposalLead,
        negotiationLeads: negotiationLead,
        wonLeads: wonLead,
        lostLeads: lostLead
    });

    } catch (error) {
        console.log(error);
        
        res.status(500).json({ message: 'Error fetching lead status', error: error.message });
    }
        
};

export const getLeadStatusApi = getLeadStatusController;