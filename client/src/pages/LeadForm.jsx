import { useEffect, useState } from "react";
import LeadStructure from "../components/LeadStructure";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { cancelFollowUp, completeFollowUp, createLead, getLead, getLeadFollowUps, getSettings, updateLead } from "../services/api";
import { getLeadFields } from "../services/api";
import FollowUpCard from "../components/follow-ups/FollowUpCard";
import FollowUpModal from "../components/follow-ups/FollowUpModal";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import { getBrowserTimeZone } from "../utils/followUpTime";

const emptyLead = {
  name: "",
  company: "",
  email: "",
  phone: "",
  source: "",
  status: "New",
  notes: "",
};
const getSavedLeadSource = (leadData) => {
  const fields = leadData.customFields instanceof Map ? Object.fromEntries(leadData.customFields) : leadData.customFields || {};
  const legacySource = Object.entries(fields)
    .find(([key]) => ["source", "lead_source"].includes(key.trim().toLowerCase().replace(/[\s-]+/g, "_")))?.[1];
  return String(leadData.source || legacySource || "").trim();
};

const getCalendarReturnTo = (value) => {
  const match = typeof value === "string" && /^\/calendar(?:\?date=(\d{4}-\d{2}-\d{2}))?$/.exec(value);
  if (!match) return "";
  if (!match[1]) return value;
  const [year, month, day] = match[1].split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? value
    : "";
};

const LeadForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [timeZone, setTimeZone] = useState(getBrowserTimeZone);
  const [customFields, setCustomFields] = useState([]);
  const [formData, setFormData] = useState({ ...emptyLead, customFields: {} });
  const [loading, setLoading] = useState(false);
  const [loadingLead, setLoadingLead] = useState(Boolean(id));
  const [error, setError] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);

  useEffect(() => {
    const closeSidebarOnMobile = () => {
      if (window.innerWidth <= 760) setSidebarOpen(false);
    };
    window.addEventListener("resize", closeSidebarOnMobile);
    return () => window.removeEventListener("resize", closeSidebarOnMobile);
  }, []);

  useEffect(() => {
    getLeadFields()
      .then(setCustomFields)
      .catch(() => setError("Unable to load custom fields."));
  }, []);

  useEffect(() => {
    getSettings()
      .then((settings) => setTimeZone(settings.workspace.timeZone || "Asia/Kolkata"))
      .catch(() => setError(`Workspace timezone is unavailable; follow-up dates use your browser timezone (${getBrowserTimeZone()}).`));
  }, []);

  useEffect(() => {
    if (!id) return;
    getLead(id)
      .then((leadData) => setFormData({ ...leadData, source: getSavedLeadSource(leadData), customFields: leadData.customFields || {} }))
      .catch(() => setError("Unable to load this lead."))
      .finally(() => setLoadingLead(false));
    getLeadFollowUps(id).then(setFollowUps).catch(() => setError("Unable to load follow-ups."));
  }, [id]);

  const handleChange = (event) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleCustomFieldsChange = (fields) => {
    setCustomFields(fields);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const saveRequest = id ? updateLead(id, formData) : createLead(formData);
    saveRequest
      .then((savedLead) => {
        const calendarReturnTo = id ? "" : getCalendarReturnTo(location.state?.returnTo);
        navigate(calendarReturnTo || "/leads", { state: { savedLead } });
      })
      .catch(() => setError("Unable to save this lead. Please check your details and try again."))
      .finally(() => setLoading(false));
  };

  const handleFollowUpSaved = (savedFollowUp) => {
    setFollowUps((current) => editingFollowUp
      ? current.map((item) => item._id === savedFollowUp._id ? savedFollowUp : item)
      : [savedFollowUp, ...current]);
    setEditingFollowUp(null);
    setFollowUpModalOpen(false);
  };

  const handleCompleteFollowUp = async (item) => {
    try {
      const updated = await completeFollowUp(item._id);
      setFollowUps((current) => current.map((entry) => entry._id === updated._id ? updated : entry));
    } catch { setError("Unable to complete follow-up."); }
  };

  const handleCancelFollowUp = async (item) => {
    if (!window.confirm("Cancel this follow-up?")) return;
    try {
      const updated = await cancelFollowUp(item._id);
      setFollowUps((current) => current.map((entry) => entry._id === updated._id ? updated : entry));
    } catch { setError("Unable to cancel follow-up."); }
  };

  return (
    <div className={`crm-shell crm-dashboard-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => {
          if (window.innerWidth <= 760) setSidebarOpen(false);
        }}
        onToggle={() => setSidebarOpen((open) => !open)}
      />
      <main className="crm-main">
        <DashboardTopbar
          hideSearch
          onNotificationsClick={() => navigate("/follow-ups")}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          sidebarOpen={sidebarOpen}
        />
        <div className="crm-page crm-dashboard-page space-y-4">
          <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <span className="crm-dashboard-eyebrow">Lead management</span>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{id ? "Edit lead" : "Add a new lead"}</h1>
              <p className="mt-1 text-sm text-slate-600">{id ? "Update the details and keep this opportunity moving." : "Lead: an enquiry or potential customer being qualified."}</p>
            </div>
            <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" type="button" onClick={() => navigate("/leads")}>Back to leads</button>
          </header>
          <section className="lead-form-card">
            {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
            {loadingLead ? <p className="py-10 text-center text-sm text-slate-500">Loading lead...</p> : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <LeadStructure formData={formData} handleChange={handleChange} loading={loading} customFields={customFields} onCustomFieldsChange={handleCustomFieldsChange} onCustomFieldValuesChange={(values) => setFormData((previous) => ({ ...previous, customFields: values }))} />
            </form>
            )}
          </section>
          {id && <section className="crm-panel lead-detail-followups"><div className="crm-panel-heading"><div><h2>Follow-ups</h2><p>Scheduled activity for this lead</p></div><button className="crm-add-button" type="button" onClick={() => setFollowUpModalOpen(true)}>+ Schedule follow-up</button></div>{followUps.length === 0 ? <p className="follow-up-empty">No follow-ups scheduled.</p> : <div className="follow-up-list">{followUps.map((item) => <FollowUpCard key={item._id} item={item} onComplete={handleCompleteFollowUp} onEdit={(followUp) => { setEditingFollowUp(followUp); setFollowUpModalOpen(true); }} onCancel={handleCancelFollowUp} />)}</div>}</section>}
        </div>
      </main>
      {followUpModalOpen && <FollowUpModal lead={formData} followUp={editingFollowUp} timeZone={timeZone} onClose={() => { setFollowUpModalOpen(false); setEditingFollowUp(null); }} onSaved={handleFollowUpSaved} />}
    </div>
  );
};

export default LeadForm;
