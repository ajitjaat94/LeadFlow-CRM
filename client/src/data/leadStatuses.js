export const LEAD_QUALIFICATION_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Negotiation",
];

export const LEGACY_LEAD_STATUSES = ["Won", "Lost"];

export const LEAD_STATUSES = [
  ...LEAD_QUALIFICATION_STATUSES,
  ...LEGACY_LEAD_STATUSES,
];
