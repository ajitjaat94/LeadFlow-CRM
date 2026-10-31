import { useEffect, useState } from "react";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import FollowUpCard from "../components/follow-ups/FollowUpCard";
import FollowUpModal from "../components/follow-ups/FollowUpModal";
import { cancelFollowUp, completeFollowUp, getFollowUps } from "../services/api";

const filters = ["All", "Upcoming", "Today", "Completed"];

const getToday = () => new Date().toISOString().slice(0, 10);
const isUpcoming = (item) => item.status === "Pending" && item.scheduledDate >= getToday();

const FollowUps = () => {
  const [followUps, setFollowUps] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);

  useEffect(() => {
    let active = true;
    getFollowUps().then((items) => {
      if (active) setFollowUps(items);
    }).catch((requestError) => {
      if (active && requestError.response?.status !== 401) setError("Unable to load follow-ups.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const visibleFollowUps = followUps.filter((item) => {
    if (filter === "Completed") return item.status === "Completed";
    if (filter === "Upcoming") return isUpcoming(item);
    if (filter === "Today") return item.status === "Pending" && item.scheduledDate === getToday();
    return true;
  });

  const handleComplete = async (item) => {
    try {
      const updated = await completeFollowUp(item._id);
      setFollowUps((current) => current.map((entry) => entry._id === updated._id ? updated : entry));
    } catch { setError("Unable to complete this follow-up."); }
  };

  const handleCancel = async (item) => {
    if (!window.confirm("Cancel this follow-up?")) return;
    try {
      const updated = await cancelFollowUp(item._id);
      setFollowUps((current) => current.map((entry) => entry._id === updated._id ? updated : entry));
    } catch { setError("Unable to cancel this follow-up."); }
  };

  return (
    <div className={`crm-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}><DashboardSidebar isOpen={sidebarOpen} onClose={() => { if (window.innerWidth <= 760) setSidebarOpen(false); }} onToggle={() => setSidebarOpen((open) => !open)} /><main className="crm-main"><DashboardTopbar searchTerm="" onSearchChange={() => {}} onAddLead={() => {}} onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} /><div className="crm-page follow-ups-page"><div className="crm-page-heading"><div><span className="crm-eyebrow">Lead activity</span><h1>Follow-ups</h1><p>Stay on top of your scheduled conversations and never miss the next step.</p></div></div><section className="crm-panel"><div className="follow-up-filters">{filters.map((option) => <button type="button" key={option} onClick={() => setFilter(option)} className={filter === option ? "follow-up-filter-active" : ""}>{option}</button>)}</div>{error && <p className="follow-up-error">{error}</p>}{loading ? <p className="follow-up-empty">Loading follow-ups...</p> : visibleFollowUps.length === 0 ? <p className="follow-up-empty">No follow-ups in this view.</p> : <div className="follow-up-list">{visibleFollowUps.map((item) => <FollowUpCard key={item._id} item={item} onComplete={handleComplete} onEdit={setEditing} onCancel={handleCancel} />)}</div>}</section></div></main>{editing && <FollowUpModal lead={editing.leadId} followUp={editing} onClose={() => setEditing(null)} onSaved={(updated) => { setFollowUps((current) => current.map((entry) => entry._id === updated._id ? updated : entry)); setEditing(null); }} />}</div>
  );
};

export default FollowUps;
