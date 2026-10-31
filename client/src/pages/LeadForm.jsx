import { useEffect, useState } from "react";
import LeadStructure from "../components/LeadStructure";
import Navbar from "../components/Navebar";
import { useParams, useNavigate } from "react-router-dom";
import { cancelFollowUp, completeFollowUp, createLead, getLead, getLeadFollowUps, updateLead } from "../services/api";
import { getLeadFields } from "../services/api";
import FollowUpCard from "../components/follow-ups/FollowUpCard";
import FollowUpModal from "../components/follow-ups/FollowUpModal";

const emptyLead = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "New",
  notes: "",
};

const LeadForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customFields, setCustomFields] = useState([]);
  const [formData, setFormData] = useState({ ...emptyLead, customFields: {} });
  const [loading, setLoading] = useState(false);
  const [loadingLead, setLoadingLead] = useState(Boolean(id));
  const [error, setError] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);

  useEffect(() => {
    getLeadFields()
      .then(setCustomFields)
      .catch(() => setError("Unable to load custom fields."));
  }, []);

  useEffect(() => {
    if (!id) return;
    getLead(id)
      .then((leadData) => setFormData({ ...leadData, customFields: leadData.customFields || {} }))
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
      .then((savedLead) => navigate("/leads", { state: { savedLead } }))
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
    <div className="min-h-screen bg-[#f7f6fb]">
      <Navbar />
      <div className="lead-page-wrap">
        <section className="lead-page-header">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="crm-eyebrow">Lead management</span>
              <h1>{id ? "Edit lead" : "Add a new lead"}</h1>
              <p>{id ? "Update the details and keep this opportunity moving." : "Capture the important details and keep your pipeline moving."}</p>
            </div>
            <button className="lead-back-button" type="button" onClick={() => navigate("/leads")}>Back to leads</button>
          </div>
        </section>
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
      {followUpModalOpen && <FollowUpModal lead={formData} followUp={editingFollowUp} onClose={() => { setFollowUpModalOpen(false); setEditingFollowUp(null); }} onSaved={handleFollowUpSaved} />}
    </div>
  );
};

export default LeadForm;
