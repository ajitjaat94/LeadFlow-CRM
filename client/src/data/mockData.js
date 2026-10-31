export const mockLeads = [
  {
    _id: "lead-1",
    name: "Ravi Mehta",
    company: "Jaipur Hotels",
    email: "ravi@jaipurhotels.in",
    phone: "+91 98765 12001",
    status: "New",
    notes: "Interested in a team plan for three properties.",
  },
  {
    _id: "lead-2",
    name: "Priya Sharma",
    company: "Sharma Realty",
    email: "priya@sharmarealty.in",
    phone: "+91 98765 12002",
    status: "Contacted",
    notes: "Follow up after the property tour on Friday.",
  },
  {
    _id: "lead-3",
    name: "Arjun Kapoor",
    company: "Green Valley Resort",
    email: "arjun@greenvalley.in",
    phone: "+91 98765 12003",
    status: "Qualified",
    notes: "Proposal ready. Decision expected this month.",
  },
  {
    _id: "lead-4",
    name: "Neha Verma",
    company: "Verma Interiors",
    email: "neha@vermainteriors.in",
    phone: "+91 98765 12004",
    status: "New",
    notes: "Requested a product walkthrough.",
  },
  {
    _id: "lead-5",
    name: "Karan Singh",
    company: "Northstar Logistics",
    email: "karan@northstarlogistics.in",
    phone: "+91 98765 12005",
    status: "Lost",
    notes: "Revisit next quarter after their budget review.",
  },
];

const storageKey = "leadflow-mock-leads";

export const getMockLeads = () => {
  const storedLeads = localStorage.getItem(storageKey);
  return storedLeads ? JSON.parse(storedLeads) : mockLeads;
};

export const saveMockLeads = (leads) => {
  localStorage.setItem(storageKey, JSON.stringify(leads));
};

export const getMockStatus = (leads) => ({
  totalLeads: leads.length,
  contactedLeads: leads.filter((lead) => lead.status === "Contacted").length,
  openLeads: leads.filter((lead) => ["New", "Qualified"].includes(lead.status)).length,
  lostLeads: leads.filter((lead) => lead.status === "Qualified").length,
});
